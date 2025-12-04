import { toast as sonnerToast } from 'sonner';

interface ToastProps {
    id: string | number;
    title: string;
    description: string;
}

/** Info icon SVG */
function InfoIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
        </svg>
    );
}

/** A fully custom toast that matches brand colors */
function Toast(props: ToastProps) {
    const { title, description } = props;

    return (
        <div
            className="max-w-sm w-full bg-(--primary-color-lighter) rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <InfoIcon className="h-6 w-6 text-(--primary-color)" />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-(--primary-color-dark-text)">
                            {title}
                        </p>
                        <p className="mt-1 text-sm text-(--text-color-lighter)">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Headless toast function - abstracts toast.custom() */
export function toast(toastData: Omit<ToastProps, 'id'>) {
    return sonnerToast.custom((id) => (
        <Toast
            id={id}
            title={toastData.title}
            description={toastData.description}
        />
    ));
}

// Export Toaster from sonner - MUST be rendered in your app!
export { Toaster as DittoToaster } from 'sonner';
