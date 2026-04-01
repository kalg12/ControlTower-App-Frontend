import { toast } from 'vue-sonner'

export function useToast() {
  function success(message: string, description?: string) {
    toast.success(message, { description })
  }

  function error(message: string, description?: string) {
    toast.error(message, { description })
  }

  function warning(message: string, description?: string) {
    toast.warning(message, { description })
  }

  function info(message: string, description?: string) {
    toast.info(message, { description })
  }

  function promise<T>(
    promiseFn: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return toast.promise(promiseFn, messages)
  }

  return { success, error, warning, info, promise, toast }
}
