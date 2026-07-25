import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { schoolsApi } from '../../api/schools.api';
import { usersApi } from '../../api/users.api';
import { apiErrorMessage } from '../../api/axios';
import type { School } from '../../types';
import { PageHeader } from '../../components/ui/Saas';

// Generates a random password that satisfies the backend's CreateUserDto
// rule for staff roles (@MinLength(8)) — same idea as
// UsersImportService.generateTempPassword, just client-side so the platform
// admin can see and copy it immediately after creating a school admin.
function generateSecurePassword(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const random = btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, '')
    .slice(0, 10);
  return `${random}Aa1!`;
}


export function PlatformAdminDashboard() {


  const queryClient = useQueryClient();



  const {
    data: schools = [],
    isLoading,
  } = useQuery({

    queryKey: ['schools'],

    queryFn: schoolsApi.findAll,

  });





  const [name, setName] = useState('');

  const [type, setType] =
    useState<'DAY' | 'BOARDING'>('DAY');


  const [contactEmail, setContactEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [address, setAddress] =
    useState('');



  const [search, setSearch] =
    useState('');



  const [error, setError] =
    useState<string | null>(null);


  const [success, setSuccess] =
    useState<string | null>(null);



  const [editingSchool, setEditingSchool] =
    useState<School | null>(null);


  // "Create School Admin" modal — opened either manually via the Schools
  // Directory (any existing school) or automatically right after a new
  // school is created, so there's always a clear path from "school exists"
  // to "someone can actually log into it".
  const [adminModalSchool, setAdminModalSchool] =
    useState<School | null>(null);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Set once creation succeeds. The password can never be fetched back from
  // the API afterwards (only a hash is stored), so this is the one moment
  // to show it for the platform admin to copy and relay.
  const [createdAdminCreds, setCreatedAdminCreds] = useState<{
    schoolName: string;
    schoolCode: string;
    email: string;
    password: string;
  } | null>(null);






  const filteredSchools = useMemo(() => {

    return schools.filter((school) => {

      const value =
        `${school.name} ${school.code}`
          .toLowerCase();


      return value.includes(
        search.toLowerCase()
      );

    });


  }, [schools, search]);







  const createMutation = useMutation({

    mutationFn: () =>

      schoolsApi.create({

        name,

        type,

        contactEmail,

        phone,

        address,

      }),




    onSuccess: (school) => {


      queryClient.invalidateQueries({

        queryKey: ['schools'],

      });



      setName('');

      setContactEmail('');

      setPhone('');

      setAddress('');



      setSuccess(
        `${school.name} created successfully — school code ${school.code}`
      );


      setError(null);


      // Guide straight into "who logs in as this school's admin?" instead
      // of leaving that as a separate, easy-to-miss step.
      openAdminModal(school);

    },



    onError: (err) => {

      setError(

        apiErrorMessage(
          err,
          'Could not create school'
        )

      );

    },

  });









  const updateMutation = useMutation({

    mutationFn: () => {


      if (!editingSchool) {

        throw new Error(
          'No school selected'
        );

      }



      return schoolsApi.update(

        editingSchool.id,

        {

          name: editingSchool.name,

          type: editingSchool.type,

          contactEmail:
            editingSchool.contactEmail ?? '',

          phone:
            editingSchool.phone ?? '',

          address:
            editingSchool.address ?? '',

        }

      );

    },




    onSuccess: () => {


      queryClient.invalidateQueries({

        queryKey: ['schools'],

      });



      setEditingSchool(null);


      setSuccess(
        'School updated successfully'
      );


    },



    onError: (err) => {

      setError(

        apiErrorMessage(
          err,
          'Could not update school'
        )

      );

    },


  });


  function openAdminModal(school: School) {
    setAdminModalSchool(school);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminError(null);
    setCreatedAdminCreds(null);
  }

  function closeAdminModal() {
    setAdminModalSchool(null);
    setCreatedAdminCreds(null);
  }

  const createAdminMutation = useMutation({

    mutationFn: () => {
      if (!adminModalSchool) {
        throw new Error('No school selected');
      }

      // Matches backend/src/users/dto/create-user.dto.ts exactly for a
      // staff role: name, role, schoolId, email, password. This reuses the
      // existing POST /users endpoint (UsersService.create) — only
      // PLATFORM_ADMIN may set schoolId to place a user outside their own
      // school, and only PLATFORM_ADMIN may assign the SCHOOL_ADMIN role,
      // both already enforced server-side.
      return usersApi.create({
        name: adminName,
        role: 'SCHOOL_ADMIN',
        schoolId: adminModalSchool.id,
        email: adminEmail,
        password: adminPassword,
      });

    },

    onSuccess: () => {

      if (!adminModalSchool) return;

      setCreatedAdminCreds({
        schoolName: adminModalSchool.name,
        schoolCode: adminModalSchool.code,
        email: adminEmail,
        password: adminPassword,
      });

      setAdminError(null);

    },

    onError: (err) => {

      setAdminError(
        apiErrorMessage(err, 'Could not create school admin')
      );

    },

  });








  return (

    <div className="space-y-8">

      <PageHeader title="Schools" />



      {/* HEADER */}

      <div className="hidden" aria-hidden="true">

        <h1 className="
          text-3xl
          font-bold
          text-[#101820]
        ">

          Assignment Hub Platform Console

        </h1>


        <p className="
          text-gray-500
          mt-2
        ">

          Manage schools and platform onboarding.

        </p>


      </div>






      {/* STAT CARDS */}

      <div className="
        hidden
        grid
        grid-cols-1
        md:grid-cols-3
        gap-5
      ">


        <StatCard

          title="Total Schools"

          value={schools.length}

        />


        <StatCard

          title="Day Schools"

          value={
            schools.filter(
              (s) => s.type === 'DAY'
            ).length
          }

        />



        <StatCard

          title="Boarding Schools"

          value={
            schools.filter(
              (s) => s.type === 'BOARDING'
            ).length
          }

        />


      </div>







      {/* CREATE SCHOOL */}

      <div className="
        bg-white
        rounded-2xl
        border
        border-gray-200
        shadow-sm
        p-6
      ">


        <h2 className="
          font-bold
          text-xl
          text-[#101820]
          mb-5
        ">

          Register New School

        </h2>





        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-4
        ">



          <input

            value={name}

            onChange={(e)=> setName(e.target.value)}

            placeholder="School name"

            className="input"

          />





          <select

            value={type}

            onChange={(e)=>

              setType(
                e.target.value as
                'DAY' | 'BOARDING'
              )

            }

            className="input"

          >

            <option value="DAY">

              Day School

            </option>


            <option value="BOARDING">

              Boarding School

            </option>


          </select>





          <input

            value={contactEmail}

            onChange={(e)=>

              setContactEmail(
                e.target.value
              )

            }

            placeholder="Contact email"

            className="input"

          />





          <input

            value={phone}

            onChange={(e)=>

              setPhone(
                e.target.value
              )

            }

            placeholder="Phone number"

            className="input"

          />





          <input

            value={address}

            onChange={(e)=>

              setAddress(
                e.target.value
              )

            }

            placeholder="Address"

            className="input"

          />


        </div>





        <button

          onClick={() =>
            createMutation.mutate()
          }


          disabled={
            createMutation.isPending ||
            !name
          }


          className="
            mt-6
            bg-[#101820]
            text-white
            px-7
            py-3
            rounded-xl
            font-semibold
            hover:bg-[#B5E61D]
            hover:text-[#101820]
            transition
            disabled:opacity-50
          "

        >

          {
            createMutation.isPending
              ? 'Creating...'
              : 'Create School'
          }


        </button>





        {success && (

          <p className="
            text-green-600
            text-sm
            mt-4
          ">

            {success}

          </p>

        )}



        {error && (

          <p className="
            text-red-600
            text-sm
            mt-4
          ">

            {error}

          </p>

        )}



      </div>
      {/* SCHOOL DIRECTORY */}

      <div className="
        bg-white
        rounded-2xl
        border
        border-gray-200
        shadow-sm
      ">


        <div className="
          p-6
          border-b
          border-gray-100
        ">


          <div className="
            flex
            flex-col
            md:flex-row
            justify-between
            gap-4
            md:items-center
          ">


            <h2 className="
              font-bold
              text-xl
              text-[#101820]
            ">

              Schools Directory

            </h2>




            <input

              value={search}

              onChange={(e)=>
                setSearch(
                  e.target.value
                )
              }

              placeholder="Search schools..."

              className="
                input
                md:max-w-xs
              "

            />


          </div>


        </div>






        {isLoading ? (

          <p className="
            p-6
            text-gray-500
          ">

            Loading schools...

          </p>


        ) : (


          <div className="divide-y">


            {filteredSchools.map((school)=>(


              <div

                key={school.id}

                className="
                  p-6
                  flex
                  items-center
                  justify-between
                  gap-4
                  hover:bg-gray-50
                  transition
                "

              >


                <div>


                  <p className="
                    font-semibold
                    text-[#101820]
                  ">

                    {school.name}

                  </p>



                  <p className="
                    text-sm
                    text-gray-500
                    mt-1
                  ">

                    {school.code}
                    {' • '}
                    {school.type}

                  </p>


                </div>





                <div className="flex items-center gap-2">

                  <button

                    onClick={()=>
                      openAdminModal(school)
                    }

                    className="
                      border
                      border-[#B5E61D]
                      text-[#101820]
                      bg-[#B5E61D]/10
                      px-5
                      py-2
                      rounded-xl
                      text-sm
                      font-semibold
                      hover:bg-[#B5E61D]
                      transition
                    "

                  >

                    Create Admin

                  </button>

                  <button

                    onClick={()=>
                      setEditingSchool(
                        school
                      )
                    }

                    className="
                      border
                      border-[#101820]
                      text-[#101820]
                      px-5
                      py-2
                      rounded-xl
                      text-sm
                      font-semibold
                      hover:bg-[#101820]
                      hover:text-white
                      transition
                    "

                  >

                    Edit

                  </button>

                </div>


              </div>


            ))}



          </div>


        )}



      </div>







      {/* EDIT MODAL */}

      {editingSchool && (


        <div className="
          fixed
          inset-0
          bg-black/50
          flex
          items-center
          justify-center
          p-5
          z-50
        ">



          <div className="
            bg-white
            rounded-3xl
            shadow-2xl
            w-full
            max-w-lg
            p-8
          ">



            <h2 className="
              text-2xl
              font-bold
              text-[#101820]
              mb-6
            ">

              Edit School

            </h2>






            <div className="
              space-y-4
            ">



              <input

                value={
                  editingSchool.name
                }

                onChange={(e)=>

                  setEditingSchool({

                    ...editingSchool,

                    name:
                    e.target.value,

                  })

                }

                className="input"

                placeholder="School name"

              />





              <select

                value={
                  editingSchool.type
                }

                onChange={(e)=>

                  setEditingSchool({

                    ...editingSchool,

                    type:
                    e.target.value as
                    'DAY' | 'BOARDING',

                  })

                }


                className="input"

              >

                <option value="DAY">

                  Day School

                </option>


                <option value="BOARDING">

                  Boarding School

                </option>


              </select>







              <input

                value={
                  editingSchool.contactEmail ?? ''
                }

                onChange={(e)=>

                  setEditingSchool({

                    ...editingSchool,

                    contactEmail:
                    e.target.value,

                  })

                }

                placeholder="Email"

                className="input"

              />







              <input

                value={
                  editingSchool.phone ?? ''
                }

                onChange={(e)=>

                  setEditingSchool({

                    ...editingSchool,

                    phone:
                    e.target.value,

                  })

                }

                placeholder="Phone"

                className="input"

              />







              <input

                value={
                  editingSchool.address ?? ''
                }

                onChange={(e)=>

                  setEditingSchool({

                    ...editingSchool,

                    address:
                    e.target.value,

                  })

                }

                placeholder="Address"

                className="input"

              />



            </div>







            <div className="
              flex
              justify-end
              gap-3
              mt-8
            ">



              <button

                onClick={()=>
                  setEditingSchool(null)
                }

                className="
                  px-5
                  py-3
                  rounded-xl
                  bg-gray-100
                  font-semibold
                "

              >

                Cancel

              </button>







              <button

                onClick={()=>
                  updateMutation.mutate()
                }


                className="
                  px-6
                  py-3
                  rounded-xl
                  bg-[#101820]
                  text-white
                  font-semibold
                  hover:bg-[#B5E61D]
                  hover:text-[#101820]
                  transition
                "

              >

                Save Changes

              </button>




            </div>




          </div>


        </div>


      )}


      {/* CREATE SCHOOL ADMIN MODAL */}

      {adminModalSchool && (

        <div className="
          fixed
          inset-0
          bg-black/50
          flex
          items-center
          justify-center
          p-5
          z-50
        ">

          <div className="
            bg-white
            rounded-3xl
            shadow-2xl
            w-full
            max-w-lg
            p-8
          ">

            {createdAdminCreds ? (

              <>

                <h2 className="text-2xl font-bold text-[#101820] mb-2">
                  School admin created
                </h2>

                <p className="text-sm text-gray-500 mb-6">
                  Save these details now — the password can't be shown again after you close this. Share them with the school admin for {createdAdminCreds.schoolName}.
                </p>

                <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
                  <CredentialRow label="School code" value={createdAdminCreds.schoolCode} />
                  <CredentialRow label="Email" value={createdAdminCreds.email} />
                  <CredentialRow label="Password" value={createdAdminCreds.password} />
                </div>

                <div className="flex justify-end mt-8">

                  <button
                    onClick={closeAdminModal}
                    className="
                      px-6
                      py-3
                      rounded-xl
                      bg-[#101820]
                      text-white
                      font-semibold
                      hover:bg-[#B5E61D]
                      hover:text-[#101820]
                      transition
                    "
                  >
                    Done
                  </button>

                </div>

              </>

            ) : (

              <>

                <h2 className="text-2xl font-bold text-[#101820] mb-1">
                  Create School Admin
                </h2>

                <p className="text-sm text-gray-500 mb-6">
                  For {adminModalSchool.name} — school code <span className="font-semibold text-[#101820]">{adminModalSchool.code}</span>
                </p>

                <div className="space-y-4">

                  <input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#B5E61D]"
                  />

                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Email address"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#B5E61D]"
                  />

                  <div className="flex gap-2">

                    <input
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password (min. 8 characters)"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#B5E61D]"
                    />

                    <button
                      type="button"
                      onClick={() => setAdminPassword(generateSecurePassword())}
                      className="shrink-0 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#101820] hover:border-[#B5E61D]"
                    >
                      Generate
                    </button>

                  </div>

                </div>

                {adminError && (
                  <p className="text-red-600 text-sm mt-4">{adminError}</p>
                )}

                <div className="flex justify-end gap-3 mt-8">

                  <button
                    onClick={closeAdminModal}
                    className="px-5 py-3 rounded-xl bg-gray-100 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => createAdminMutation.mutate()}
                    disabled={
                      createAdminMutation.isPending ||
                      !adminName ||
                      !adminEmail ||
                      adminPassword.length < 8
                    }
                    className="
                      px-6
                      py-3
                      rounded-xl
                      bg-[#101820]
                      text-white
                      font-semibold
                      hover:bg-[#B5E61D]
                      hover:text-[#101820]
                      transition
                      disabled:opacity-50
                    "
                  >
                    {createAdminMutation.isPending ? 'Creating...' : 'Create Admin'}
                  </button>

                </div>

              </>

            )}

          </div>

        </div>

      )}



    </div>


  );

}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono font-semibold text-[#101820]">{value}</span>
    </div>
  );
}







function StatCard({

  title,

  value,

}: {

  title:string;

  value:number;

}) {


  return (

    <div className="
      bg-white
      rounded-2xl
      border
      border-gray-200
      shadow-sm
      p-6
      relative
      overflow-hidden
    ">


      <div className="
        absolute
        top-0
        left-0
        h-1
        w-full
        bg-[#B5E61D]
      " />



      <p className="
        text-gray-500
        text-sm
        font-medium
      ">

        {title}

      </p>




      <p className="
        text-4xl
        font-bold
        text-[#101820]
        mt-3
      ">

        {value}

      </p>



    </div>

  );

}
