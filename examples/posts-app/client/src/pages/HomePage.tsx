import { Link } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { PostList } from '@/components/PostList.js'
import { Button } from '@/components/ui/button.js'

export function HomePage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Powered by{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              hono-tanstack-query
            </code>
          </p>
        </div>
        <Button asChild>
          <Link to="/posts/new">
            <PenLine size={16} />
            New post
          </Link>
        </Button>
      </header>

      <PostList />
    </div>
  )
}
