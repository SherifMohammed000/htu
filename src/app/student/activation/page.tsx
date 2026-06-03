import { FaceCapture } from "@/components/FaceCapture";

export default function ActivationPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">
          Account Activation
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Please capture a clear photo of your face. This image will be used to verify your identity when marking attendance.
        </p>
      </div>

      <FaceCapture />
    </div>
  );
}
