
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <Skeleton className="h-9 w-3/4 mx-auto mb-2" />
      <Skeleton className="h-5 w-1/4 mx-auto" />
    </div>
    <Card className="border-0 shadow-lg"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-0 shadow-lg"><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      <Card className="border-0 shadow-lg"><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      <Card className="border-0 shadow-lg"><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
    </div>
    <Card className="border-0 shadow-lg"><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
  </div>
);

export const ActivityGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex justify-between items-center mt-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export const ChatSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          i % 2 === 0 ? 'bg-blue-500' : 'bg-gray-200'
        }`}>
          <Skeleton className={`h-4 w-full ${i % 2 === 0 ? 'bg-blue-400' : 'bg-gray-300'}`} />
          <Skeleton className={`h-4 w-3/4 mt-2 ${i % 2 === 0 ? 'bg-blue-400' : 'bg-gray-300'}`} />
        </div>
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center space-x-4 mb-6">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton = ({ count = 5, showAvatar = true }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

export const DiscoverSkeleton = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 flex-grow" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ))}
        </div>
    </div>
);

export const LibrarySkeleton = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-48" />
        </div>
        <div className="flex gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 flex-grow" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ))}
        </div>
    </div>
);

export const CommunitySkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            {[...Array(4)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
        </div>
        <div className="space-y-6">
            <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
    </div>
);

export const AIAssistantSkeleton = () => (
    <div className="flex h-[calc(100vh-200px)]">
        <div className="w-1/4 border-r p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
        <div className="flex-1 flex flex-col p-4">
            <div className="flex-grow space-y-4">
                <div className="flex justify-start"><Skeleton className="h-16 w-3/4 rounded-lg" /></div>
                <div className="flex justify-end"><Skeleton className="h-20 w-2/3 rounded-lg" /></div>
                <div className="flex justify-start"><Skeleton className="h-12 w-1/2 rounded-lg" /></div>
            </div>
            <div className="mt-4"><Skeleton className="h-12 w-full rounded-lg" /></div>
        </div>
    </div>
);
