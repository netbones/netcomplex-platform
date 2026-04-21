# best practice gathering toast errors sonner

Using Sonner for error handling is a popular choice due to its opinionated design and efficient Promise API. To gather and display errors effectively, follow these best practices:

1.  Leverage the Promise API
    Instead of manually checking for errors in try/catch blocks for every request, use toast.promise(). This automatically manages loading, success, and error states with minimal code.

        Best Practice: Pass the original promise and let Sonner handle the state transitions. If you need to manipulate the data before displaying the error, you can use the error callback to format the message dynamically based on the caught error object.

2.  Make Error Messages Actionable
    A common mistake is showing a generic "Something went wrong" message. Instead, provide specific feedback and a way to recover.

        Detailed Context: Use the description field to provide additional technical details or validation steps.
        Retry Mechanisms: Include an action button within the error toast to allow users to retry the operation immediately.

3.  Maintain UX & Accessibility
    Toasts should be helpful without being intrusive or confusing for users with screen readers.

        Appropriate Styling: Ensure error toasts use the built-in error variant (typically a red background or icon) so they are visually distinct from success messages.
        Duration: Keep error toasts visible long enough to be read—generally between 3 to 7 seconds—unless they contain a critical action button.
        Aria Labels: Sonner supports aria-live regions; ensure your error messages are concise so screen readers don't get overwhelmed.

4.  Strategic Placement & Aggregation

Avoid "toast spam" when multiple errors occur, such as in bulk uploads or chained API requests.

    Batching: If multiple errors occur at once, aggregate them into a single toast (e.g., "10 files uploaded — 2 failed") rather than showing 10 separate toasts.
    Contextual use: Only use toasts for passive warnings or updates. If an error requires a major user decision or blocks the entire workflow, consider using an inline alert or a dialog instead.

- Summary Table: Sonner Error Patterns
  Feature Best Practice Benefit
  Promise State Use toast.promise() Reduces boilerplate code
  Interaction Add action or cancel buttons Encourages user recovery
  Styling Use toast.error() specifically Visual clarity of failure
  Information Use description for details Helps users debug the issue
  Would you like a code example of how to implement toast.promise with a custom error-formatting callback?

Using toast.promise is the most efficient way to handle async operations in Sonner. You can pass a function to the error property that receives the rejection reason and returns a custom message or configuration.
Code Implementation

## Here is how to implement a promise toast that dynamically formats error messages based on the caught error:

```tsx
import { toast } from 'sonner';

const updateProfile = async data => {
  const response = await fetch('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    // Throwing a custom message or code allows the toast to be specific
    if (response.status === 401) throw new Error('Session Expired');
    if (response.status === 413) throw new Error('File too large');
    throw new Error('Update failed');
  }
  return response.json();
};

const handleSubmit = formData => {
  toast.promise(updateProfile(formData), {
    loading: 'Updating your profile...',
    success: 'Profile updated successfully!',
    // The error callback receives the caught error object
    error: err => {
      return {
        title: 'Submission failed',
        description: err.message, // Uses the specific message thrown above
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(formData), // Optional retry logic
        },
      };
    },
  });
};
```

- Key Techniques used:

  Dynamic Messages: Instead of a static string, the error property uses a callback to extract err.message.
  Object Configuration: By returning an object rather than a string, you can add a description or action buttons specifically for the error state.
  Custom Rejections: By throwing specific errors in your fetch logic (like "File too large"), the toast becomes more actionable for the user.

# how to style these toasts specifically using Tailwind CSS or standard CSS?

    Promise toasts - React Native Bread - Mintlify
    The toast.promise() method takes a promise and message configuration for each state: * import { toast } from 'react-native-bread';
    Mintlify
    Promise Toast with Error - shadcn.io
    Promise Toast with Error. Content (5) Interactive (4) Position (6) Promise (4) Basic Promise ToastPromise Toast with DataPromise T...
    shadcn.io
    Enhanced Configuration for toast.promise States #464 - GitHub
    02 Jul 2024 — Feature Request: Enhanced Configuration for toast. promise States. Problem Statement: Currently, toast. promise supports basic cus...
    GitHub

## Styling

Sonner effectively depends on whether you want to override its default look or build a completely custom design from scratch.

1. Styling with Tailwind CSS
   The most flexible way to use Tailwind with Sonner is via the toastOptions prop. You can target specific parts of the toast (like the title or action button) using the classNames object.
   Global Configuration:
   Place this in your root layout so all toasts share the same design.

```tsx
<Toaster
  toastOptions={{
    unstyled: true, // Removes default Sonner styles for full control
    classNames: {
      toast:
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-lg flex items-center gap-3 w-full',
      title: 'text-sm font-semibold text-zinc-900 dark:text-zinc-100',
      description: 'text-xs text-zinc-500 dark:text-zinc-400',
      actionButton:
        'bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors',
      cancelButton:
        'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 rounded-md text-xs',
      error: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900', // Targeted error variant style
    },
  }}
/>
```

## 2. Styling with Standard CSS

If you prefer traditional CSS, you can use CSS Variables or Global Selectors. Sonner exposes several data attributes and classes you can target.
Customizing via CSS Variables:

```css
/_ In your global.css _/ [data-sonner-toaster] {
  --normal-bg: #fff;
  --normal-border: #e2e8f0;
  --error-bg: #fef2f2;
  --error-border: #fee2e2;
  --error-text: #991b1b;
}

/_ Targeting specific elements _/ .sonner-toast-error {
  border-radius: 12px !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

# 3. Using "Rich Colors"

If you just want a quick improvement without writing much CSS, enable the richColors prop. This applies pre-styled, high-contrast colors to success, error, and info toasts.

```tsx
<Toaster richColors />
```

4. Per-Toast Styling
   You can also override styles for a single specific toast call if it needs to look different from the global theme.

```tsx
toast.error('Payment failed', {
  className: 'border-2 border-red-500 bg-red-50',
  descriptionClassName: 'text-red-800 font-medium',
});
```

## How to create a fully custom JSX component to replace the standard toast layout entirely?

    xiaoluoboding/vue-sonner: 🔔 An opinionated toast component ...
    01 Oct 2025 — Default theme is light. Position. You can change the position through the position prop on the component. Default is top-right . E...
    GitHub·
    Using Sonner Toast in Nextjs | React
    03 Dec 2024 — hello welcome back to the tutorial. so guys this is going to be a video about how we can use the sonar twist in the next JS. so gu...
    YouTube·Tutorend
    8:30
    wobsoriano/svelte-sonner: An opinionated toast ... - GitHub
    Types * Default. Most basic toast. You can customize it (and any other type) by passing an options object as the second argument. ...
    GitHub

To create a fully custom toast, you can pass a
JSX element directly into toast(). This bypasses Sonner's default structure entirely, giving you 100% control over the layout, icons, and animations.

1. Create a Custom Error Component

- First, build a reusable component. Using Tailwind CSS makes this easy to manage:

```tsx
const CustomErrorToast = ({
  message,
  details,
  t,
}: {
  message: string;
  details: string;
  t: any;
}) => (
  <div className="flex w-full items-start gap-4 rounded-xl border border-red-200 bg-white p-4 shadow-xl dark:border-red-900 dark:bg-zinc-950">
    {/* Custom Icon */}
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
    </div>
    <div className="flex-1">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{message}</h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{details}</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => toast.dismiss(t)}
          className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>
);
```

# 2. Trigger the Custom Toast

When you call toast(), you pass the component as the first argument. Sonner provides the unique toast ID (t) so you can manually dismiss it if needed.

```tsx
const handleError = (error: Error) => {
  toast.custom(t => <CustomErrorToast t={t} message="Upload Failed" details={error.message} />, {
    duration: 5000,
    position: 'bottom-right',
  });
};
```

3. Usage with toast.promise
   You can even return custom JSX within the error state of a promise:

```tsx
toast.promise(uploadFile(file), {
  loading: 'Uploading...',
  success: 'Done!',
  error: err => (
    <div className="flex flex-col gap-1 p-2">
      <span className="font-bold text-red-500">Critical Error</span>
      <code className="text-[10px] bg-red-50 p-1 rounded">{err.message}</code>
    </div>
  ),
});
```

Key Advantages:

    Brand Alignment: Match your app's specific design system (rounded corners, specific shadows).
    Complex Layouts: Add progress bars, multiple action buttons, or even small forms inside a toast.
    Total Control: Sonner handles the "stacking" and "swiping" logic, while you handle the "visuals."
