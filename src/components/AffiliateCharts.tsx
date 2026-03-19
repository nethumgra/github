"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// දැනට පෙන්වීමට dummy data (පසුව Firestore clicks_history එකට සම්බන්ධ කළ හැක)
const data = [
  { day: 'Mon', clicks: 20 }, { day: 'Tue', clicks: 45 },
  { day: 'Wed', clicks: 38 }, { day: 'Thu', clicks: 65 },
  { day: 'Fri', clicks: 48 }, { day: 'Sat', clicks: 80 },
  { day: 'Sun', clicks: 95 },
];

export default function AffiliateCharts() {
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-rose-100 shadow-sm h-[350px] w-full">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8">Click Performance (Weekly)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#fda4af', fontSize: 10, fontWeight: 'bold'}} />
          <Tooltip 
            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(225,29,72,0.1)', fontSize: '10px', fontWeight: 'bold' }} 
          />
          <Area type="monotone" dataKey="clicks" stroke="#e11d48" strokeWidth={4} fillOpacity={1} fill="url(#colorClicks)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}