import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { apiErrorMessage } from '../../api/axios';

// Teacher dashboard supports:
// - Manual assignment creation (/teacher/assignments/new)
// - AI assignment generation (/teacher/assignments/generate)
// - JSON upload validation and publishing (/assignments/validate + /assignments/from-json)

export function TeacherDashboard() {
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.findAll(),
  });

  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: (json: unknown) => assignmentsApi.validateJson(json),
    onSuccess: (res) => setValidation(res),
    onError: (err) => setStatus(apiErrorMessage(err, 'Validation failed')),
  });

  const createMutation = useMutation({
    mutationFn: (json: unknown) => assignmentsApi.createFromJson(json),
    onSuccess: () => {
      setStatus('Assignment created.');
      setJsonText('');
      setValidation(null);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not create assignment')),
  });

  function parsedOrNull(): unknown | null {
    try {
      return JSON.parse(jsonText);
    } catch {
      setStatus('That is not valid JSON.');
      return null;
    }
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Teacher Dashboard
        </h1>

        <div className="flex gap-2">

          <Link
            to="/teacher/assignments/new"
            className="px-3 py-2 text-sm rounded border border-gray-300"
          >
            + Manual assignment
          </Link>

          <Link
            to="/teacher/assignments/generate"
            className="px-3 py-2 text-sm rounded bg-purple-600 text-white"
          >
            ✨ Generate with AI
          </Link>

          <Link
            to="/teacher/marking"
            className="px-3 py-2 text-sm rounded bg-brand text-white"
          >
            Marking
          </Link>

        </div>
      </div>


      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">

        <h2 className="font-medium text-sm">
          Upload Assignment (JSON)
        </h2>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={8}
          placeholder="Paste an exam JSON payload (see frontend/shared/assignment_template.json for the shape)"
          className="w-full text-xs font-mono border border-gray-300 rounded p-3"
        />


        <div className="flex gap-2">

          <button
            onClick={() => {
              const parsed = parsedOrNull();
              if (parsed) {
                validateMutation.mutate(parsed);
              }
            }}
            className="px-3 py-2 text-sm rounded border border-gray-300"
          >
            Validate
          </button>


          <button
            onClick={() => {
              const parsed = parsedOrNull();
              if (parsed) {
                createMutation.mutate(parsed);
              }
            }}
            disabled={createMutation.isPending}
            className="px-3 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
          >
            {createMutation.isPending ? 'Publishing...' : 'Publish'}
          </button>

        </div>


        {validation && (
          <div
            className={`text-sm ${
              validation.valid
                ? 'text-green-700'
                : 'text-red-600'
            }`}
          >

            {validation.valid ? (
              'Valid — ready to publish.'
            ) : (
              <ul className="list-disc pl-5">
                {validation.errors.map((e, i) => (
                  <li key={i}>
                    {e}
                  </li>
                ))}
              </ul>
            )}

          </div>
        )}


        {status && (
          <p className="text-sm text-gray-600">
            {status}
          </p>
        )}

      </div>


      <div className="bg-white rounded-lg border border-gray-200">

        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-sm">
            Your Assignments
          </h2>
        </div>


        {isLoading && (
          <p className="p-4 text-sm text-gray-500">
            Loading...
          </p>
        )}


        <ul className="divide-y divide-gray-100">

          {(assignments ?? []).map((a) => (

            <li
              key={a.id}
              className="px-4 py-3 flex items-center justify-between text-sm"
            >

              <div>

                <p className="font-medium">
                  {a.title}
                </p>

                <p className="text-gray-500">
                  {a.subject} · Grade {a.grade}
                </p>

              </div>


              <span
                className={`text-xs px-2 py-1 rounded ${
                  a.isPublished
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {a.isPublished ? 'Published' : 'Draft'}
              </span>


            </li>

          ))}

        </ul>

      </div>

    </div>
  );
}