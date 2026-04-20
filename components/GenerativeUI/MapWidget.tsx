

import React from 'react';
import { MapMarker } from '../../types';

interface MapWidgetProps {
  title: string;
  markers: MapMarker[];
}

export const MapWidget: React.FC<MapWidgetProps> = ({ title, markers }) => {
  if (!markers || markers.length === 0) return null;

  const getTypeIcon = (type?: string) => {
    switch(type) {
      case 'office': return <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
      case 'datacenter': return <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>;
      case 'client': return <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
      case 'event': return <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      default: return <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    }
  };

  return (
    <div className="w-full my-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-400">{title}</h3>
        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{markers.length} Locations</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {markers.map((marker) => {
            const hasCoords = typeof marker.latitude === 'number' && typeof marker.longitude === 'number';
            const mapUrl = hasCoords
                ? `https://www.google.com/maps/search/?api=1&query=${marker.latitude},${marker.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.address || marker.label)}`;

            return (
                <div key={marker.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group flex gap-4 items-start">
                    <div className="shrink-0 p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                    {getTypeIcon(marker.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 truncate">{marker.label}</h4>
                        {hasCoords && (
                        <span className="text-[8px] font-black text-slate-300 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">COORD</span>
                        )}
                    </div>
                    
                    {marker.address && (
                        <p className="text-xs text-slate-500 mt-1 font-medium italic truncate">{marker.address}</p>
                    )}
                    
                    {marker.description && (
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{marker.description}</p>
                    )}

                    <div className="mt-4 flex gap-2">
                        <a 
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                        >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Open Maps
                        </a>
                    </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};