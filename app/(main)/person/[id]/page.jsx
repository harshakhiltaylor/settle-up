"use client"

import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { BarLoader } from 'react-spinners';

const PersonPage = () => {

    const params = useParams();
    const router = useRouter();
   const [activeTab , setactiveTab] = useState("expenses"); 
    

   const {data , isLoading} = useConvexQuery(api.expenses.getExpenseBetweenUsers , {userId: params.id});


   if(isLoading)
   {
        return (<div className='container mx-auto py-12'>
            <BarLoader width={"100%"} color='#36d7b7'/>
        </div>)
   }

   const otherUser = data?.otherUser;
   const expenses = data?.expenses;
   const settlements = data?.settlements;
   const balance = data?.balance || 0;

  return (
      <div>

        <div className=' mb-6'>
            <Button variant="outline" size="sm" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className='h-4 w-4 mr-2'/>
            </Button>
        </div>

      </div>
    )



}

export default PersonPage