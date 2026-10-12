import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenCheck,
  Download,
  FileText,
  LibraryBig,
  Package,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import {
  resourcesApi,
  type MarketplacePaymentMethod,
  type ResourceListing,
  type ResourceListingType,
} from '../../api/resources.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';

const TYPES: Array<{ value: ResourceListingType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'NOTES', label: 'Notes' },
  { value: 'ESSAY', label: 'Essays' },
  { value: 'REVISION_GUIDE', label: 'Revision' },
  { value: 'STUDY_GUIDE', label: 'Study guides' },
  { value: 'TOOLKIT', label: 'Toolkits' },
];

function textLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priceLabel(value: number) {
  return value === 0 ? 'Free' : `KES ${value.toLocaleString()}`;
}

export function MyResourcesPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'MARKETPLACE' | 'LIBRARY'>('MARKETPLACE');
  const [type, setType] = useState<ResourceListingType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ResourceListing | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const listingsQuery = useQuery({
    queryKey: ['resources', type],
    queryFn: () => resourcesApi.findAll(type === 'ALL' ? undefined : { type }),
  });
  const purchasesQuery = useQuery({
    queryKey: ['resource-purchases'],
    queryFn: resourcesApi.myPurchases,
  });

  const listings = listingsQuery.data ?? [];
  const ownedIds = new Set((purchasesQuery.data ?? [])
    .filter((purchase) => purchase.status === 'PAID' || purchase.status === 'FULFILLED')
    .map((purchase) => purchase.resource.id));
  const visible = useMemo(() => {
    const source = view === 'LIBRARY' ? listings.filter((listing) => ownedIds.has(listing.id)) : listings;
    const query = search.trim().toLowerCase();
    return query
      ? source.filter((listing) => `${listing.title} ${listing.subject ?? ''} ${listing.seller.name}`.toLowerCase().includes(query))
      : source;
  }, [listings, ownedIds, search, view]);

  async function download(resource: ResourceListing) {
    try {
      setStatus('Preparing secure download...');
      const result = await resourcesApi.download(resource.id);
      window.location.assign(result.url);
      setStatus(null);
    } catch (error) {
      setStatus(apiErrorMessage(error, 'Download could not be prepared'));
    }
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['resources'] }),
      queryClient.invalidateQueries({ queryKey: ['resource-purchases'] }),
    ]);
  }

  return (
    <div className="space-y-5 pb-12">
      <PageHeader title="My Resources" meta={view === 'MARKETPLACE' ? `${listings.length} available` : `${ownedIds.size} in your library`} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <ViewButton active={view === 'MARKETPLACE'} onClick={() => setView('MARKETPLACE')} icon={ShoppingBag} label="Marketplace" />
          <ViewButton active={view === 'LIBRARY'} onClick={() => setView('LIBRARY')} icon={LibraryBig} label="My library" />
        </div>
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:w-72">
          <Search className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      </div>

      {view === 'MARKETPLACE' ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPES.map((item) => (
            <button key={item.value} type="button" onClick={() => setType(item.value)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${type === item.value ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item.label}</button>
          ))}
        </div>
      ) : null}

      {status ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{status}</p> : null}

      {listingsQuery.isLoading || purchasesQuery.isLoading ? (
        <EmptyState title="Loading resources..." />
      ) : listingsQuery.isError || purchasesQuery.isError ? (
        <EmptyState title="Resources are temporarily unavailable." />
      ) : visible.length === 0 ? (
        <EmptyState title={view === 'LIBRARY' ? 'Your library is empty.' : 'No matching resources.'} />
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              owned={ownedIds.has(resource.id)}
              onSelect={() => setSelected(resource)}
              onDownload={() => void download(resource)}
            />
          ))}
        </section>
      )}

      {selected ? <PurchasePanel resource={selected} onClose={() => setSelected(null)} onPurchased={refresh} /> : null}
    </div>
  );
}

function ViewButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof ShoppingBag; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${active ? 'bg-white text-[#101820] shadow-sm' : 'text-slate-500'}`}><Icon className="h-4 w-4" strokeWidth={1.8} />{label}</button>;
}

function ResourceCard({ resource, owned, onSelect, onDownload }: { resource: ResourceListing; owned: boolean; onSelect: () => void; onDownload: () => void }) {
  const Icon = resource.fulfillment === 'PHYSICAL_DELIVERY' ? Package : resource.type === 'ESSAY' ? FileText : BookOpenCheck;
  const pending = resource.purchaseStatus === 'AWAITING_VERIFICATION';
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#101820]"><Icon className="h-5 w-5" strokeWidth={1.75} /></div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{textLabel(resource.type)}</span>
      </div>
      <h2 className="mt-4 break-words text-base font-semibold leading-6 text-[#101820]">{resource.title}</h2>
      <p className="mt-1 text-xs text-slate-500">{[resource.subject, resource.grade, resource.seller.name].filter(Boolean).join(' · ')}</p>
      {resource.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{resource.description}</p> : null}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="font-semibold text-[#101820]">{priceLabel(resource.priceKES)}</span>
        {owned && resource.fulfillment === 'DIGITAL_DOWNLOAD' ? (
          <button type="button" onClick={onDownload} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"><Download className="h-4 w-4" />Download</button>
        ) : pending ? (
          <span className="text-xs font-semibold text-amber-700">Verification pending</span>
        ) : (
          <button type="button" onClick={onSelect} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#101820]">{resource.priceKES === 0 ? 'Add to library' : resource.fulfillment === 'PHYSICAL_DELIVERY' ? 'Order' : 'Purchase'}</button>
        )}
      </div>
    </article>
  );
}

function PurchasePanel({ resource, onClose, onPurchased }: { resource: ResourceListing; onClose: () => void; onPurchased: () => Promise<void> }) {
  const [method, setMethod] = useState<MarketplacePaymentMethod | ''>('');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const paymentQuery = useQuery({ queryKey: ['resource-payment-options'], queryFn: resourcesApi.paymentOptions, enabled: resource.priceKES > 0 });
  const selectedProvider = paymentQuery.data?.find((provider) => provider.method === method);
  const mutation = useMutation({
    mutationFn: () => resourcesApi.purchase(resource.id, {
      paymentMethod: method || undefined,
      paymentReference: reference.trim() || undefined,
      payerPhone: phone.trim() || undefined,
      deliveryName: deliveryName.trim() || undefined,
      deliveryPhone: phone.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
    }),
    onSuccess: async () => { await onPurchased(); onClose(); },
    onError: (caught) => setError(apiErrorMessage(caught, 'Purchase could not be submitted')),
  });
  const paid = resource.priceKES > 0;
  const physical = resource.fulfillment === 'PHYSICAL_DELIVERY';
  const canSubmit = (!paid || (method && reference.trim())) && (!physical || (deliveryName.trim() && phone.trim() && deliveryAddress.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101820]/50 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`Purchase ${resource.title}`}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{physical ? 'Order toolkit' : 'Add resource'}</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">{resource.title}</h2><p className="mt-1 font-semibold text-slate-600">{priceLabel(resource.priceKES)}</p></div><button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200" aria-label="Close"><X className="h-5 w-5" /></button></div>

        {paid ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {(paymentQuery.data ?? []).map((provider) => <button key={provider.method} type="button" onClick={() => setMethod(provider.method)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left ${method === provider.method ? 'border-[#101820] bg-slate-50' : 'border-slate-200'}`}>{provider.logoUrl ? <img src={provider.logoUrl} alt="" className="h-8 w-16 object-contain" /> : null}<span className="text-sm font-semibold text-[#101820]">{provider.displayName}</span></button>)}
            </div>
            {paymentQuery.isSuccess && !paymentQuery.data.length ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No marketplace payment method is currently enabled.</p> : null}
            {selectedProvider ? <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><p>{selectedProvider.instructions}</p>{Object.entries(selectedProvider.paymentDetails ?? {}).filter(([, value]) => typeof value === 'string' && value !== 'Not configured').map(([key, value]) => <p key={key} className="mt-1"><span className="font-semibold text-[#101820]">{textLabel(key)}:</span> {String(value)}</p>)}</div> : null}
            <Field label="Payment reference" value={reference} onChange={setReference} placeholder="Enter transaction reference" />
            <Field label="Phone number" value={phone} onChange={setPhone} placeholder="07..." />
          </div>
        ) : null}

        {physical ? <div className="mt-4 space-y-4"><Field label="Recipient name" value={deliveryName} onChange={setDeliveryName} /><Field label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Town, school or collection point" /></div> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        <button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending} className="mt-5 min-h-12 w-full rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500">{mutation.isPending ? 'Submitting...' : paid ? 'Submit purchase' : 'Add to library'}</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#101820]" /></label>;
}
