import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentMethod,
  Prisma,
  ResourceFulfillment,
  ResourceListingStatus,
  ResourcePurchaseStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { normalizeGrade } from '../common/utils/grade.util';
import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { PurchaseResourceDto } from './dto/purchase-resource.dto';
import { ReviewResourcePurchaseDto } from './dto/review-resource-purchase.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

const LISTING_INCLUDE = {
  seller: { select: { id: true, name: true, school: { select: { name: true } } } },
  _count: { select: { purchases: true } },
} as const;

@Injectable()
export class ResourcesService {
  private readonly platformFeeBps: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly uploads: UploadsService,
    private readonly paymentService: PaymentService,
  ) {
    const configured = Number(this.config.get('RESOURCE_PLATFORM_FEE_BPS') ?? 1500);
    this.platformFeeBps = Number.isInteger(configured) && configured >= 0 && configured <= 10_000
      ? configured
      : 1500;
  }

  async findAll(
    actor: AuthenticatedUser,
    filters: { type?: string; subject?: string; search?: string },
  ) {
    const ownSellerFilter = actor.role === Role.TEACHER ? [{ sellerId: actor.id }] : [];
    const listings = await this.prisma.resourceListing.findMany({
      where: {
        OR: actor.role === Role.PLATFORM_ADMIN
          ? undefined
          : [{ status: ResourceListingStatus.PUBLISHED }, ...ownSellerFilter],
        ...(filters.type ? { type: filters.type as any } : {}),
        ...(filters.subject ? { subject: { equals: filters.subject, mode: 'insensitive' } } : {}),
        ...(filters.search
          ? {
              AND: [{ OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { subject: { contains: filters.search, mode: 'insensitive' } },
              ] }],
            }
          : {}),
        ...(actor.role === Role.STUDENT && actor.grade
          ? { AND: [{ OR: [{ grade: null }, { grade: actor.grade }] }] }
          : {}),
      },
      include: {
        ...LISTING_INCLUDE,
        ...(actor.role === Role.STUDENT
          ? { purchases: { where: { studentId: actor.id }, orderBy: { createdAt: 'desc' as const }, take: 1 } }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return listings.map((listing) => this.toPublicListing(listing));
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const listing = await this.prisma.resourceListing.findUnique({
      where: { id },
      include: {
        ...LISTING_INCLUDE,
        purchases: actor.role === Role.STUDENT
          ? { where: { studentId: actor.id }, orderBy: { createdAt: 'desc' }, take: 1 }
          : false,
      },
    });
    if (!listing) throw new NotFoundException('Resource not found');
    if (
      listing.status !== ResourceListingStatus.PUBLISHED
      && actor.role !== Role.PLATFORM_ADMIN
      && listing.sellerId !== actor.id
    ) {
      throw new NotFoundException('Resource not found');
    }
    return this.toPublicListing(listing);
  }

  getPaymentOptions() {
    return this.paymentService.getPaymentProviders().then((providers) =>
      providers.filter((provider) =>
        provider.isActive
        && (provider.method === PaymentMethod.MPESA || provider.method === PaymentMethod.EQUITY_PAYBILL),
      ),
    );
  }

  async create(dto: CreateResourceDto, actor: AuthenticatedUser) {
    this.validateListing(dto);
    return this.prisma.resourceListing.create({
      data: {
        schoolId: actor.schoolId,
        sellerId: actor.id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        type: dto.type,
        fulfillment: dto.fulfillment,
        subject: dto.subject?.trim() || null,
        grade: dto.grade ? normalizeGrade(dto.grade) ?? dto.grade.trim() : null,
        priceKES: dto.priceKES,
        platformFeeBps: this.platformFeeBps,
        assetKey: dto.assetKey ?? null,
        fileName: dto.fileName ?? null,
        fileSize: dto.fileSize ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        stockQuantity: dto.fulfillment === ResourceFulfillment.PHYSICAL_DELIVERY ? dto.stockQuantity ?? 0 : null,
      },
      include: LISTING_INCLUDE,
    });
  }

  async update(id: number, dto: UpdateResourceDto, actor: AuthenticatedUser) {
    const current = await this.findOwnedListing(id, actor);
    const merged = { ...current, ...dto } as CreateResourceDto;
    this.validateListing(merged);
    return this.prisma.resourceListing.update({
      where: { id },
      data: {
        ...dto,
        title: dto.title?.trim(),
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        subject: dto.subject !== undefined ? dto.subject?.trim() || null : undefined,
        grade: dto.grade !== undefined ? dto.grade ? normalizeGrade(dto.grade) ?? dto.grade.trim() : null : undefined,
      },
      include: LISTING_INCLUDE,
    });
  }

  async publish(id: number, actor: AuthenticatedUser) {
    const listing = await this.findOwnedListing(id, actor);
    this.validateListing(listing as CreateResourceDto);
    return this.prisma.resourceListing.update({
      where: { id },
      data: { status: ResourceListingStatus.PUBLISHED, publishedAt: listing.publishedAt ?? new Date() },
      include: LISTING_INCLUDE,
    });
  }

  async archive(id: number, actor: AuthenticatedUser) {
    await this.findOwnedListing(id, actor);
    return this.prisma.resourceListing.update({
      where: { id },
      data: { status: ResourceListingStatus.ARCHIVED },
      include: LISTING_INCLUDE,
    });
  }

  async myListings(actor: AuthenticatedUser) {
    const where = actor.role === Role.PLATFORM_ADMIN ? {} : { sellerId: actor.id };
    const rows = await this.prisma.resourceListing.findMany({
      where,
      include: LISTING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toPublicListing(row));
  }

  async sellerSummary(actor: AuthenticatedUser) {
    const sellerFilter = actor.role === Role.PLATFORM_ADMIN ? {} : { resource: { sellerId: actor.id } };
    const [confirmed, awaiting, recentSales] = await Promise.all([
      this.prisma.resourcePurchase.aggregate({
        where: {
          ...sellerFilter,
          status: { in: [ResourcePurchaseStatus.PAID, ResourcePurchaseStatus.FULFILLED] },
        },
        _sum: { sellerShareKES: true, platformFeeKES: true, amountKES: true },
        _count: true,
      }),
      this.prisma.resourcePurchase.count({
        where: { ...sellerFilter, status: ResourcePurchaseStatus.AWAITING_VERIFICATION },
      }),
      this.prisma.resourcePurchase.findMany({
        where: {
          ...sellerFilter,
          status: { in: [ResourcePurchaseStatus.PAID, ResourcePurchaseStatus.FULFILLED] },
        },
        include: {
          student: { select: { name: true } },
          resource: { select: { title: true, sellerId: true } },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 20,
      }),
    ]);
    return {
      confirmedSales: confirmed._count,
      grossKES: confirmed._sum.amountKES ?? 0,
      sellerShareKES: confirmed._sum.sellerShareKES ?? 0,
      platformFeeKES: confirmed._sum.platformFeeKES ?? 0,
      awaitingVerification: awaiting,
      recentSales,
    };
  }

  async purchase(id: number, dto: PurchaseResourceDto, actor: AuthenticatedUser) {
    const listing = await this.prisma.resourceListing.findFirst({
      where: { id, status: ResourceListingStatus.PUBLISHED },
    });
    if (!listing) throw new NotFoundException('Resource not found');
    if (listing.sellerId === actor.id) throw new BadRequestException('You cannot purchase your own resource');
    if (listing.fulfillment === ResourceFulfillment.PHYSICAL_DELIVERY) {
      if (!dto.deliveryName || !dto.deliveryPhone || !dto.deliveryAddress) {
        throw new BadRequestException('Delivery name, phone and address are required');
      }
      if ((listing.stockQuantity ?? 0) < 1) throw new BadRequestException('This item is out of stock');
    }
    if (listing.priceKES > 0) {
      if (!dto.paymentMethod || !dto.paymentReference?.trim()) {
        throw new BadRequestException('Payment method and reference are required');
      }
      const providers = await this.getPaymentOptions();
      if (!providers.some((provider) => provider.method === dto.paymentMethod)) {
        throw new BadRequestException('That payment method is not available');
      }
    }
    const existing = await this.prisma.resourcePurchase.findFirst({
      where: {
        resourceId: id,
        studentId: actor.id,
        status: { in: [ResourcePurchaseStatus.AWAITING_VERIFICATION, ResourcePurchaseStatus.PAID, ResourcePurchaseStatus.FULFILLED] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && listing.fulfillment === ResourceFulfillment.DIGITAL_DOWNLOAD) return existing;

    const platformFeeKES = Math.round((listing.priceKES * listing.platformFeeBps) / 10_000);
    return this.prisma.resourcePurchase.create({
      data: {
        schoolId: actor.schoolId,
        resourceId: id,
        studentId: actor.id,
        status: listing.priceKES === 0 ? ResourcePurchaseStatus.PAID : ResourcePurchaseStatus.AWAITING_VERIFICATION,
        paymentMethod: listing.priceKES === 0 ? null : dto.paymentMethod,
        paymentReference: dto.paymentReference?.trim() || null,
        payerPhone: dto.payerPhone?.trim() || null,
        amountKES: listing.priceKES,
        platformFeeKES,
        sellerShareKES: listing.priceKES - platformFeeKES,
        deliveryDetails: listing.fulfillment === ResourceFulfillment.PHYSICAL_DELIVERY
          ? { name: dto.deliveryName, phone: dto.deliveryPhone, address: dto.deliveryAddress }
          : Prisma.JsonNull,
      },
      include: { resource: { include: { seller: { select: { name: true } } } } },
    });
  }

  myPurchases(actor: AuthenticatedUser) {
    return this.prisma.resourcePurchase.findMany({
      where: { studentId: actor.id },
      include: { resource: { include: { seller: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  adminPurchases() {
    return this.prisma.resourcePurchase.findMany({
      include: {
        student: { select: { id: true, name: true, school: { select: { name: true } } } },
        resource: { include: { seller: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async reviewPurchase(id: number, dto: ReviewResourcePurchaseDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.resourcePurchase.findUnique({ where: { id }, include: { resource: true } });
      if (!purchase) throw new NotFoundException('Purchase not found');
      if (purchase.status !== ResourcePurchaseStatus.AWAITING_VERIFICATION) {
        throw new BadRequestException('This purchase has already been reviewed');
      }
      if (!dto.approved && !dto.reason?.trim()) throw new BadRequestException('A rejection reason is required');
      if (
        dto.approved
        && purchase.resource.fulfillment === ResourceFulfillment.PHYSICAL_DELIVERY
      ) {
        const updated = await tx.resourceListing.updateMany({
          where: { id: purchase.resourceId, stockQuantity: { gt: 0 } },
          data: { stockQuantity: { decrement: 1 } },
        });
        if (!updated.count) throw new BadRequestException('This item is out of stock');
      }
      return tx.resourcePurchase.update({
        where: { id },
        data: {
          status: dto.approved ? ResourcePurchaseStatus.PAID : ResourcePurchaseStatus.REJECTED,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          rejectionReason: dto.approved ? null : dto.reason?.trim(),
        },
      });
    });
  }

  async download(id: number, actor: AuthenticatedUser) {
    const listing = await this.prisma.resourceListing.findUnique({ where: { id } });
    if (!listing || !listing.assetKey || !listing.fileName) throw new NotFoundException('Download not available');
    const isOwner = actor.role === Role.PLATFORM_ADMIN || listing.sellerId === actor.id;
    const purchase = isOwner ? null : await this.prisma.resourcePurchase.findFirst({
      where: {
        resourceId: id,
        studentId: actor.id,
        status: { in: [ResourcePurchaseStatus.PAID, ResourcePurchaseStatus.FULFILLED] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!isOwner && !purchase) throw new ForbiddenException('Purchase access is required');
    if (purchase) {
      await this.prisma.resourcePurchase.update({ where: { id: purchase.id }, data: { lastDownloadedAt: new Date() } });
    }
    return {
      url: await this.uploads.createPrivateDownloadUrl(listing.assetKey, listing.fileName),
      expiresInSeconds: 300,
    };
  }

  private validateListing(dto: CreateResourceDto) {
    if (dto.fulfillment === ResourceFulfillment.DIGITAL_DOWNLOAD && (!dto.assetKey || !dto.fileName)) {
      throw new BadRequestException('Upload a PDF before publishing this resource');
    }
    if (dto.fulfillment === ResourceFulfillment.PHYSICAL_DELIVERY && dto.stockQuantity == null) {
      throw new BadRequestException('Stock quantity is required for physical products');
    }
    if (dto.assetKey && !dto.assetKey.startsWith('marketplace-private/')) {
      throw new BadRequestException('Invalid marketplace file');
    }
  }

  private async findOwnedListing(id: number, actor: AuthenticatedUser) {
    const listing = await this.prisma.resourceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Resource not found');
    if (actor.role !== Role.PLATFORM_ADMIN && listing.sellerId !== actor.id) {
      throw new ForbiddenException('You can only manage your own resources');
    }
    return listing;
  }

  private toPublicListing<T extends { assetKey?: string | null; purchases?: Array<{ status: ResourcePurchaseStatus }> }>(listing: T) {
    const { assetKey: _assetKey, purchases, ...safe } = listing;
    return {
      ...safe,
      purchaseStatus: purchases?.[0]?.status ?? null,
      downloadAvailable: Boolean(_assetKey) && (
        purchases?.[0]?.status === ResourcePurchaseStatus.PAID
        || purchases?.[0]?.status === ResourcePurchaseStatus.FULFILLED
      ),
    };
  }
}
