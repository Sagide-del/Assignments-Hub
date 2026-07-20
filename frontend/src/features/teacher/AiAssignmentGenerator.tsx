import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { aiApi } from '../../api/ai.api';
import { assignmentsApi } from '../../api/assignments.api';

import type {
  AssignmentJsonPayload,
  GeneratedAssignmentJson,
  GenerateAssignmentInput,
  AiQuestionType,
} from '../../types';

function transformToAssignmentJson(
  generated: GeneratedAssignmentJson,
): AssignmentJsonPayload {
  return {
    title: generated.title,
    description: generated.description,
    subject: generated.subject,
    grade: generated.grade,

    sections: generated.sections.map((section) => ({
      name: section.title,
      description: section.instructions,

      questions: section.questions.map((question) => ({
        questionText: question.questionText,
        type: question.questionType,
        points: question.points,
        options: question.options,
        correctAnswer: question.correctAnswer,
      })),
    })),
  };
}

const questionTypes: AiQuestionType[] = [
  'MULTIPLE_CHOICE',
  'ESSAY',
  'TRUE_FALSE',
  'FILL_BLANK',
];

export default function AiAssignmentGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<GenerateAssignmentInput>({
    grade: '',
    subject: '',
    topic: '',
    strand: '',
    subStrand: '',
    numberOfQuestions: 10,
    questionTypes: ['MULTIPLE_CHOICE'],
  });

  const [preview, setPreview] =
    useState<AssignmentJsonPayload | null>(null);

  const [validation, setValidation] = useState<any>(null);

  const [error, setError] = useState('');

  const generateMutation = useMutation({
    mutationFn: aiApi.generateAssignment,

    onSuccess(data) {
      setPreview(transformToAssignmentJson(data));
      setValidation(null);
      setError('');
    },

    onError(err: any) {
      if (err.response?.status === 403) {
        setError(
          'Your school has reached its monthly AI generation limit.',
        );
      } else if (err.response?.status === 503) {
        setError(
          'AI service is currently unavailable. Please try again later.',
        );
      } else {
        setError(
          'Unable to generate assignment.',
        );
      }
    },
  });


  const validateMutation = useMutation({
    mutationFn: assignmentsApi.validateJson,

    onSuccess(data) {
      setValidation(data);
    },
  });


  const publishMutation = useMutation({
    mutationFn: assignmentsApi.createFromJson,

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ['assignments'],
      });

      navigate('/teacher');
    },
  });


  function updateField(
    field: keyof GenerateAssignmentInput,
    value: any,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }


  function toggleQuestionType(type: AiQuestionType) {
    setForm((previous) => ({
      ...previous,

      questionTypes:
        previous.questionTypes.includes(type)
          ? previous.questionTypes.filter(
              (item) => item !== type,
            )
          : [
              ...previous.questionTypes,
              type,
            ],
    }));
  }


  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        AI Assignment Generator
      </h1>


      {error && (
        <div className="rounded bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}


      <div className="grid grid-cols-2 gap-4">


        <input
          className="border p-2 rounded"
          placeholder="Grade"
          value={form.grade}
          onChange={(e) =>
            updateField('grade', e.target.value)
          }
        />


        <input
          className="border p-2 rounded"
          placeholder="Subject"
          value={form.subject}
          onChange={(e) =>
            updateField('subject', e.target.value)
          }
        />


        <input
          className="border p-2 rounded"
          placeholder="Topic"
          value={form.topic}
          onChange={(e) =>
            updateField('topic', e.target.value)
          }
        />


        <input
          className="border p-2 rounded"
          placeholder="Strand"
          value={form.strand}
          onChange={(e) =>
            updateField('strand', e.target.value)
          }
        />


        <input
          className="border p-2 rounded"
          placeholder="Sub Strand"
          value={form.subStrand}
          onChange={(e) =>
            updateField('subStrand', e.target.value)
          }
        />


        <input
          type="number"
          className="border p-2 rounded"
          value={form.numberOfQuestions}
          onChange={(e) =>
            updateField(
              'numberOfQuestions',
              Number(e.target.value),
            )
          }
        />


      </div>


      <div>
        <p className="font-semibold">
          Question Types
        </p>

        <div className="flex gap-4 mt-2">

          {questionTypes.map((type) => (

            <label key={type}>

              <input
                type="checkbox"
                checked={
                  form.questionTypes.includes(type)
                }
                onChange={() =>
                  toggleQuestionType(type)
                }
              />

              <span className="ml-2">
                {type}
              </span>

            </label>

          ))}

        </div>
      </div>



      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={generateMutation.isPending}
        onClick={() =>
          generateMutation.mutate(form)
        }
      >
        {generateMutation.isPending
          ? 'Generating...'
          : 'Generate Assignment'}
      </button>



      {preview && (

        <div className="border rounded p-4 space-y-4">

          <h2 className="text-xl font-bold">
            Preview
          </h2>


          <pre className="bg-gray-100 p-3 overflow-auto">
            {JSON.stringify(preview, null, 2)}
          </pre>



          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() =>
              validateMutation.mutate(preview)
            }
          >
            Validate
          </button>


          {validation && (

            <div>

              <p>
                Valid:
                {' '}
                {validation.valid ? 'YES' : 'NO'}
              </p>


              <p>
                Total Marks:
                {' '}
                {validation.computedTotalMarks}
              </p>


              {validation.errors?.length > 0 && (

                <ul>
                  {validation.errors.map(
                    (item:string) => (
                      <li key={item}>
                        {item}
                      </li>
                    ),
                  )}
                </ul>

              )}


              {validation.valid && (

                <button
                  className="bg-purple-600 text-white px-4 py-2 rounded mt-3"
                  onClick={() =>
                    publishMutation.mutate(preview)
                  }
                >
                  Publish Assignment
                </button>

              )}

            </div>

          )}

        </div>

      )}

    </div>
  );
}