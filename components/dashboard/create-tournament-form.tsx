"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { createTournament, deleteTournament, getTournaments, updateTournament } from "@/lib/firestore-service";
import type { Tournament } from "@/lib/types";

export function CreateTournamentForm() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [published, setPublished] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Tournament | null>(null);
  async function load() { setItems(await getTournaments()); }
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);
  function beginEdit(item: Tournament) { setEditing(item); setPublished(item.published ?? false); setRegistrationOpen(item.registrationOpen ?? false); }
  function reset() { setEditing(null); setPublished(false); setRegistrationOpen(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const start = new Date(String(data.get("startDate")));
    const payload = { name: String(data.get("name")).trim(), location: String(data.get("location")).trim(), description: String(data.get("description")).trim(), startDate: start.toISOString(), status: String(data.get("status")) as Tournament["status"], matchDuration: Number(data.get("matchDuration")), breakDuration: Number(data.get("breakDuration")), fieldCount: Number(data.get("fieldCount")), format: editing?.format ?? "ROUND_ROBIN" as const, published, registrationOpen };
    if (!payload.name || Number.isNaN(start.getTime())) { setMessage("Името и началната дата са задължителни."); return; }
    setLoading(true); setMessage("");
    try { if (editing) await updateTournament(editing.id, payload); else await createTournament(payload); form.reset(); reset(); await load(); setMessage(editing ? "Турнирът е обновен." : "Турнирът е създаден."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Операцията е неуспешна."); } finally { setLoading(false); }
  }
  async function remove() { if (!pendingDelete) return; setLoading(true); try { await deleteTournament(pendingDelete.id); setPendingDelete(null); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Турнирът не може да бъде изтрит."); } finally { setLoading(false); } }
  const localDate = editing ? editing.startDate.slice(0, 16) : "";
  return <div className="space-y-6"><Card><CardHeader><CardTitle>{editing ? "Редактирай турнир" : "Създай турнир"}</CardTitle><CardDescription>Това е същият документ, който се показва в публичната платформа.</CardDescription></CardHeader><CardContent><form key={editing?.id ?? "new"} onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2 md:col-span-2"><Label htmlFor="name">Име</Label><Input id="name" name="name" defaultValue={editing?.name} required /></div><div className="space-y-2"><Label htmlFor="location">Локация</Label><Input id="location" name="location" defaultValue={editing?.location} /></div><div className="space-y-2"><Label htmlFor="startDate">Начало</Label><Input id="startDate" name="startDate" type="datetime-local" defaultValue={localDate} required /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="description">Описание</Label><Input id="description" name="description" defaultValue={editing?.description} /></div>
    <div className="space-y-2"><Label htmlFor="status">Статус</Label><Select id="status" name="status" defaultValue={editing?.status ?? "UPCOMING"}><option value="UPCOMING">Предстоящ</option><option value="ACTIVE">Активен</option><option value="FINISHED">Приключил</option><option value="CANCELLED">Отменен</option></Select></div><div className="grid grid-cols-3 gap-2"><div><Label>Мач (мин.)</Label><Input name="matchDuration" type="number" min={1} defaultValue={editing?.matchDuration ?? 10} /></div><div><Label>Пауза</Label><Input name="breakDuration" type="number" min={0} defaultValue={editing?.breakDuration ?? 5} /></div><div><Label>Игрища</Label><Input name="fieldCount" type="number" min={1} defaultValue={editing?.fieldCount ?? 1} /></div></div>
    <div className="flex items-center justify-between rounded-md border p-3"><Label htmlFor="published">Публикуван турнир</Label><Switch id="published" checked={published} onCheckedChange={setPublished} /></div><div className="flex items-center justify-between rounded-md border p-3"><Label htmlFor="registrationOpen">Регистрацията е отворена</Label><Switch id="registrationOpen" checked={registrationOpen} onCheckedChange={setRegistrationOpen} /></div>
    <div className="flex gap-2 md:col-span-2"><Button disabled={loading}>{loading ? "Записване..." : editing ? "Запази" : "Създай"}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Отказ</Button>}</div></form>{message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Всички турнири</CardTitle></CardHeader><CardContent>{items.length === 0 ? <p className="py-8 text-center text-muted-foreground">Все още няма турнири.</p> : <Table><THead><TR><TH>Турнир</TH><TH>Статус</TH><TH>Публичен</TH><TH>Действия</TH></TR></THead><TBody>{items.map((item) => <TR key={item.id}><TD>{item.name}<div className="text-xs text-muted-foreground">{item.location}</div></TD><TD><Badge variant="outline">{item.status ?? "UPCOMING"}</Badge></TD><TD>{item.published ? "Да" : "Не"}</TD><TD className="space-x-2"><Button size="sm" variant="outline" onClick={() => beginEdit(item)}>Редактирай</Button><Button size="sm" variant="ghost" onClick={() => setPendingDelete(item)}>Изтрий</Button></TD></TR>)}</TBody></Table>}</CardContent></Card><AlertDialog open={Boolean(pendingDelete)} title="Изтриване на турнир" description="Сигурни ли сте? Турнир със свързани категории, отбори или мачове няма да бъде изтрит." onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} loading={loading} /></div>;
}
