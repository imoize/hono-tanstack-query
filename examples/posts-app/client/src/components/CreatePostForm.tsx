import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, X } from "lucide-react";
import { api } from "@/lib/api.js";
import { ApiError } from "hono-tanstack-query";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Badge } from "@/components/ui/badge.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}): React.JSX.Element {
  const [input, setInput] = useState("");

  const addTag = (): void => {
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string): void =>
    onChange(tags.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add a tag and press Enter"
        />
        <Button type="button" variant="outline" size="icon" onClick={addTag}>
          <Plus size={16} />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full hover:bg-secondary-foreground/20"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CreatePostForm ───────────────────────────────────────────────────────────

export function CreatePostForm(): React.JSX.Element {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    content: "",
    author: "",
    tags: [] as string[],
  });

  // api.posts.$post maps to POST /posts.
  // useMutation() is injected by HonoReactQuery.
  // - mutate / mutateAsync are typed: they only accept the correct request body shape
  // - data is typed as the 201 response body (Post)
  // - error is typed as ApiError<ValidationError | ...>
  const { mutate, isPending, error, reset } = api.posts.$post.useMutation({
    onSuccess: (post) => {
      // `post` is fully typed as Post from the server's 201 response — no cast needed.
      // Navigate to the newly created post's detail page.
      void navigate(`/posts/${post.id}`);
    },
  });

  // Extract field-level validation errors from the 422 response body.
  // error.body is typed as the server's ValidationError shape.
  const fieldError = (field: string): string | undefined => {
    if (!error || !(error instanceof ApiError)) return undefined;
    if (!error.isUnprocessable()) return undefined;
    const body = error.body as {
      issues?: Array<{ path: string[]; message: string }>;
    };
    return body.issues?.find((i) => i.path[0] === field)?.message;
  };

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    reset();
    // mutate is typed — TypeScript will error if `json` doesn't match CreatePostBody.
    mutate({ json: form });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Write a new post</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give your post a title"
              className={fieldError("title") ? "border-destructive" : ""}
            />
            {fieldError("title") && (
              <p className="text-xs text-destructive">{fieldError("title")}</p>
            )}
          </div>

          {/* Author */}
          <div className="space-y-1.5">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Your name"
              className={fieldError("author") ? "border-destructive" : ""}
            />
            {fieldError("author") && (
              <p className="text-xs text-destructive">{fieldError("author")}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your post content here…"
              rows={6}
              className={fieldError("content") ? "border-destructive" : ""}
            />
            {fieldError("content") && (
              <p className="text-xs text-destructive">
                {fieldError("content")}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
            />
          </div>

          {/* Global / unexpected error */}
          {error && !error.isUnprocessable() && (
            <p className="text-sm text-destructive">
              {error.message ?? "Something went wrong. Please try again."}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Publishing…
              </>
            ) : (
              "Publish post"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
