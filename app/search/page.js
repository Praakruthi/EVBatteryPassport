'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { Card, Table, Badge, Msg } from '@/components/ui';

export default function Search() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  async function go(e) { e.preventDefault(); setErr(''); try { setRes(await api(`/api/search?q=${encodeURIComponent(q)}`)); } catch (x) { setErr(x.message); } }
  const link = (r) => <Link href={`/batteries/${r.battery_id}`}>{r.serial_number}</Link>;
  const rel = { key: 'relevance', label: 'Relevance', render: (r) => Number(r.relevance).toFixed(2) };
  return (
    <>
      <h1>Search</h1>
      <p className="sub">Batteries by serial/manufacturer/model, plus MySQL FULLTEXT search (MATCH … AGAINST) across repair notes, assessment explanations and refurbishment work. Try “cooling”, “collision”, “BMS”, “cells”.</p>
      <form className="row" onSubmit={go} style={{ marginBottom: 16 }}><input style={{ maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" autoFocus /><button>Search</button></form>
      <Msg error={err} />
      {res && (
        <>
          <Card title={`Batteries (${res.batteries.length})`}><Table rows={res.batteries} columns={[{ key: 'serial_number', label: 'Serial', render: link }, { key: 'manufacturer_name', label: 'Manufacturer' }, { key: 'model_name', label: 'Model' }, { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> }, { key: 'current_soh_pct', label: 'SOH %' }]} /></Card>
          <Card title={`Repair notes (${res.repairs.length})`}><Table rows={res.repairs} columns={[{ key: 'serial_number', label: 'Battery', render: link }, { key: 'repair_date', label: 'Date' }, { key: 'repair_type', label: 'Type', render: (r) => <Badge value={r.repair_type} /> }, { key: 'description', label: 'Description' }, rel]} /></Card>
          <Card title={`Assessment explanations (${res.assessments.length})`}><Table rows={res.assessments} columns={[{ key: 'serial_number', label: 'Battery', render: link }, { key: 'decision', label: 'Decision', render: (r) => <Badge value={r.decision} /> }, { key: 'explanation', label: 'Explanation' }, rel]} /></Card>
          <Card title={`Refurbishment work (${res.refurbishments.length})`}><Table rows={res.refurbishments} columns={[{ key: 'serial_number', label: 'Battery', render: link }, { key: 'outcome', label: 'Outcome', render: (r) => <Badge value={r.outcome} /> }, { key: 'work_done', label: 'Work' }, rel]} /></Card>
        </>
      )}
    </>
  );
}
