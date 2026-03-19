"use client";
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export const useAffiliate = () => {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    if (ref) {
      localStorage.setItem('ls_ref_id', ref);
      console.log("Affiliate Captured Securely:", ref);
    }
  }, [ref]);
};