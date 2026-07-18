import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { schoolsApi } from '../../api/schools.api';
import { apiErrorMessage } from '../../api/axios';
import type { School } from '../../types';


function suggestCode(name: string): string {

  const initials = name
    .replace(/[^a-zA-Z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4) || 'SCH';


  const number =
    Math.floor(10000 + Math.random() * 89999);


  return `${initials}${number}`;

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

  const [code, setCode] = useState('');

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

        code,

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

      setCode('');

      setContactEmail('');

      setPhone('');

      setAddress('');



      setSuccess(
        `${school.name} created successfully`
      );


      setError(null);


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








  return (

    <div className="space-y-8">



      {/* HEADER */}

      <div>

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

            onChange={(e)=>{

              setName(e.target.value);


              if(!code){

                setCode(
                  suggestCode(
                    e.target.value
                  )
                );

              }

            }}

            placeholder="School name"

            className="input"

          />





          <input

            value={code}

            onChange={(e)=>

              setCode(
                e.target.value.toUpperCase()
              )

            }

            placeholder="School code"

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
            !name ||
            !code
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