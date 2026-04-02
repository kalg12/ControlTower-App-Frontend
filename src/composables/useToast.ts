import { toast } from 'vue3-toastify'

export function useToast() {
  function success(message: string, description?: string) {
    toast.success(description ? `${message} — ${description}` : message)
  }

  function error(message: string, description?: string) {
    toast.error(description ? `${message} — ${description}` : message)
  }

  function warning(message: string, description?: string) {
    toast.warning(description ? `${message} — ${description}` : message)
  }

  function info(message: string, description?: string) {
    toast.info(description ? `${message} — ${description}` : message)
  }

  function promise<T>(
    promiseFn: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    const id = toast.loading(messages.loading)
    return promiseFn
      .then(result => {
        toast.update(id, { render: messages.success, type: 'success', isLoading: false, autoClose: 3000 })
        return result
      })
      .catch(err => {
        toast.update(id, { render: messages.error, type: 'error', isLoading: false, autoClose: 3000 })
        throw err
      })
  }

  return { success, error, warning, info, promise, toast }
}
