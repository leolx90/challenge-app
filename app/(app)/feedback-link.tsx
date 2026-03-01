"use client";

import { useState } from "react";

const FEEDBACK_EMAIL = "leoinboxfor-challengeapp@yahoo.com";

export default function FeedbackLink() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 underline hover:text-gray-700"
      >
        Give Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Give Feedback</h3>
            <p className="mb-4 text-sm text-gray-700">
              Please send your feedback to{" "}
              <a
                href={`mailto:${FEEDBACK_EMAIL}`}
                className="font-medium text-blue-600 underline hover:text-blue-700"
              >
                {FEEDBACK_EMAIL}
              </a>
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
