import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLinkSchema } from "@/lib/schemas";

interface LinkFormProps {
  onSave: (data: { label: string; url: string }) => void | Promise<void>;
}

export function LinkForm({ onSave }: LinkFormProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createLinkSchema.safeParse({ label, url });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[issue.path.join(".") || "form"] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSave({ label: parsed.data.label, url: parsed.data.url });
      setLabel("");
      setUrl("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_2fr_auto] items-center"
    >
      <div>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (Instagram)"
          required
        />
        {errors.label && <p className="mt-1 text-xs text-destructive">{errors.label}</p>}
      </div>
      <div>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          required
          type="url"
        />
        {errors.url && <p className="mt-1 text-xs text-destructive">{errors.url}</p>}
      </div>
      <Button type="submit" size="md" disabled={submitting} className="rounded-lg py-3">
        {submitting ? "Menambah..." : "+ Tambah"}
      </Button>
    </form>
  );
}
