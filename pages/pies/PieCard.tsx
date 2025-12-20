import React from 'react';
import { Card } from '../../ui/Card';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PieCardProps {
  name: string;
  desc: string;
  risk: number;
  value: number;
  growth: number;
}

export const PieCard: React.FC<PieCardProps> = ({ name, desc, risk, value, growth }) => {
  return (
    <Link to={`/pies/${name.toLowerCase().replace(/\s/g, '-')}`}>
      <Card className="hover:bg-zinc-900/80 transition-colors cursor-pointer h-full flex flex-col justify-between">
        <div>
           <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-white">{name}</h3>
              <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-1 h-3 rounded-full ${i <= risk ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
                 ))}
              </div>
           </div>
           <p className="text-sm text-zinc-400 mb-6">{desc}</p>
        </div>
        
        <div>
           <p className="text-xs text-zinc-500 uppercase font-medium">Total Value</p>
           <div className="flex justify-between items-end mt-1">
              <span className="text-xl font-bold text-white">${value.toLocaleString()}</span>
              <span className="text-sm font-medium text-app-success flex items-center">
                 <ArrowUpRight size={14} /> {growth}%
              </span>
           </div>
        </div>
      </Card>
    </Link>
  );
};