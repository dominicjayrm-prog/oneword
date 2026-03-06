const DEFAULT_TIMEOUT = 15000;

export function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}
