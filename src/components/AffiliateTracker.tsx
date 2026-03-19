"use client";
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

function TrackerLogic() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    const trackClick = async () => {
      // 1. Ref එකක් තියෙනවාද සහ මේ Session එකේදී දැනටමත් මේක track කරලා නැද්ද කියා බැලීම
      if (ref && !sessionStorage.getItem(`tracked_${ref}`)) {
        
        // 2. වහාම Session Storage එකේ සලකුණු කිරීම (Double click වැළැක්වීමට)
        sessionStorage.setItem(`tracked_${ref}`, 'true');
        
        // 3. පසුව Checkout එකේදී පාවිච්චි කිරීමට LocalStorage එකේ සේව් කිරීම
        localStorage.setItem('ls_referrer_id', ref);

        try {
          // 4. Firestore එකේ Click Count එක 1කින් පමණක් වැඩි කිරීම
          const affiliateRef = doc(db, "users", ref);
          await updateDoc(affiliateRef, {
            totalClicks: increment(1)
          });
          console.log("Affiliate click tracked once!");
        } catch (error) {
          console.error("Tracking Error:", error);
          // Error එකක් ආවොත් නැවත උත්සාහ කිරීමට session storage එක clear කළ හැක
          sessionStorage.removeItem(`tracked_${ref}`);
        }
      }
    };

    trackClick();
  }, [ref]);

  return null;
}

export default function AffiliateTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerLogic />
    </Suspense>
  );
}