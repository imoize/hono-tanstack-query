import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CreatePostForm } from '@/components/CreatePostForm.js'
import { Button } from '@/components/ui/button.js'

export function NewPostPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
        <Link to="/">
          <ArrowLeft size={16} />
          All posts
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight mb-8">New post</h1>

      <CreatePostForm />
    </div>
  )
}
