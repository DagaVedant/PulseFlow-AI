import { useEffect, useState } from "react";

export function useTypewriter(text: string, speedMs: number = 20) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;

    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);

    return () => clearInterval(id);
  }, [text, speedMs]);

  return { displayed, done: displayed.length === text.length };
}
