import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import VideoUpload from '../components/VideoUpload';

export default async function Home() {
  const { userId } = await auth();
  
  if (!userId) {
     return (
         <div className="text-center mt-20">
            <h1 className="text-5xl font-bold mb-4">Your Second Brain for Video.</h1>
            <p className="text-xl text-slate-400">Sign in to start indexing your knowledge.</p>
         </div>
     )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Library</h1>
        {/* We will add the component here */}
      </div>

      <VideoUpload />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
         <div className="border border-slate-800 p-10 rounded-lg text-center text-slate-500">
            No videos yet.
         </div>
      </div>
    </div>
  );
}