import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  ShieldAlert,
  Search,
  ArrowUpRight,
  ExternalLink,
  MapPin,
  ArrowRightLeft,
  Flag,
  ShieldCheck
} from 'lucide-react';
import { API } from '../services/api.js';

export const GeoIntelligencePage: React.FC = () => {
  const [countries, setCountries] = useState<any[]>([]);
  const [asns, setAsns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cRes, aRes] = await Promise.all([
          API.getGeoCountries(),
          API.getGeoASNs()
        ]);
        setCountries(cRes);
        setAsns(aRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCountries = countries.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-xs animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold text-slate-100 font-mono uppercase tracking-tight">
              Cross-Border Intelligence & Network Routing
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            Global virtual asset traffic flows across 13 sovereign routing zones, cross-border corridors, and autonomous system telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
            100% Offline GeoIP DB
          </span>
        </div>
      </div>

      {/* Cross-Border Corridors Banner */}
      <div className="bg-[#080f1d] border border-white/10 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 font-mono uppercase text-xs">
              Primary Cross-Border Virtual Asset Corridors
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">SYNTHETIC OBSERVATIONS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-[10px]">CORRIDOR 01</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">India ➔ UAE (Dubai)</div>
            <div className="text-emerald-400 text-[11px] mt-1">Outbound High-Velocity</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-[10px]">CORRIDOR 02</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">Singapore ➔ India</div>
            <div className="text-blue-400 text-[11px] mt-1">Inbound OTC / Liquidity</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-[10px]">CORRIDOR 03</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">United States ➔ Europe</div>
            <div className="text-purple-400 text-[11px] mt-1">Global Institutional Flow</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <div className="text-slate-400 text-[10px]">CORRIDOR 04</div>
            <div className="text-slate-100 font-bold text-xs mt-0.5">United Kingdom ➔ India</div>
            <div className="text-amber-400 text-[11px] mt-1">Cross-Border Remittance</div>
          </div>
        </div>
      </div>

      {/* Sovereign Jurisdictions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Traffic Table (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Sovereign Jurisdictions Traffic Matrix</span>
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter country..."
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-slate-200 text-xs outline-none font-mono"
            />
          </div>

          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#09090b] text-slate-400 text-[10px] uppercase font-mono font-bold">
                  <th className="py-2.5 px-3">ISO</th>
                  <th className="py-2.5 px-3">Country Name</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3 text-right">Transactions</th>
                  <th className="py-2.5 px-3 text-center">Avg Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-emerald-400 font-mono animate-pulse">
                      Aggregating geo routing telemetry...
                    </td>
                  </tr>
                ) : filteredCountries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      No country records match search.
                    </td>
                  </tr>
                ) : (
                  filteredCountries.map((c) => (
                    <tr key={c.country} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-bold font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.country === 'IN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300'}`}>
                          {c.country}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{c.name || c.country}</td>
                      <td className="py-2.5 px-3 text-slate-400">{c.region || 'Global'}</td>
                      <td className="py-2.5 px-3 text-right text-slate-100 font-mono font-bold">{c.count}</td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                            c.riskAvg >= 60 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {c.riskAvg}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Autonomous Systems (ASN) Explorer (1 Col) */}
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wider">
              <Radio className="w-4 h-4 text-blue-400" />
              <span>Autonomous Systems (ASN)</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">{asns.length} Networks</span>
          </div>

          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-emerald-400 font-mono animate-pulse">
                Loading ASNs...
              </div>
            ) : (
              asns.map((a) => (
                <div
                  key={a.asn}
                  className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  <div className="overflow-hidden pr-2">
                    <span className="text-blue-400 font-bold font-mono text-xs block">{a.asn}</span>
                    <span className="text-slate-300 text-xs font-medium block truncate">{a.organization}</span>
                    <span className="text-slate-500 text-[10px] font-mono block">{a.country} · {a.type || 'ISP / Transit'}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-xs font-mono font-bold block">
                      {a.count} txs
                    </span>
                    <span className={`text-[10px] font-mono font-bold mt-1 block ${a.riskAvg >= 60 ? 'text-red-400' : 'text-slate-400'}`}>
                      Avg {a.riskAvg}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
