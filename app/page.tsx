"use client";

import { useEffect, useMemo, useState } from "react";
import { missions } from "@/data/missions";
import { clearState, emptyState, loadState, saveState } from "@/lib/storage";
import type { GameState, Player } from "@/lib/types";
import { Skull, Target, Users, Trophy, History, Plus, Shuffle, X, Check, AlertTriangle, Smartphone, Copy } from "lucide-react";

type Tab = "players" | "accusations" | "chaos" | "leaders" | "history";

const uid = () => Math.random().toString(36).slice(2, 10);

function addLog(state: GameState, text: string): GameState {
  return { ...state, logs: [{ id: uid(), time: Date.now(), text }, ...state.logs] };
}

function prettyTime(t: number) {
  return new Date(t).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [state, setState] = useState<GameState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("players");
  const [newName, setNewName] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerFilter, setPlayerFilter] = useState<"all"|"attention"|"needs"|"active"|"guessed"|"completed"|"chaos">("all");
  const [playerSort, setPlayerSort] = useState<"attention"|"number"|"name"|"score">("attention");
  const [confirmMode, setConfirmMode] = useState<"new"|"clear"|null>(null);
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState<null | {
    title: string; message: string; confirmLabel?: string; cancelLabel?: string;
    danger?: boolean; onConfirm?: () => void;
  }>(null);
  const [chaosAssignOpen, setChaosAssignOpen] = useState(false);
  const [chaosAssignCount, setChaosAssignCount] = useState(1);
  const [chaosAssignMode, setChaosAssignMode] = useState<"manual"|"random">("manual");
  const [chaosManualPlayerId, setChaosManualPlayerId] = useState("");
  const [scoreboardOpen, setScoreboardOpen] = useState(false);

  useEffect(() => { setState(loadState()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) saveState(state); }, [state, loaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const selected = state.players.find(p => p.id === selectedPlayerId);
  const leaderboard = useMemo(() => [...state.players].sort((a,b) => b.score-a.score), [state.players]);

  const needsMission = (player:Player) =>
    player.role === "agent" &&
    (!player.currentMission ||
      ["guessed","cancelled","completed","failed"].includes(player.currentMission.status));

  const attentionCount = useMemo(
    () => state.players.filter(needsMission).length,
    [state.players]
  );

  const visiblePlayers = useMemo(() => {
    const originalIndex = new Map(state.players.map((player,index)=>[player.id,index]));

    const filtered = state.players.filter(player => {
      const status = player.currentMission?.status;
      if (playerFilter === "all") return true;
      if (playerFilter === "attention" || playerFilter === "needs") return needsMission(player);
      if (playerFilter === "active") return status === "active";
      if (playerFilter === "guessed") return status === "guessed" || status === "failed";
      if (playerFilter === "completed") return status === "completed";
      if (playerFilter === "chaos") return player.role === "chaos";
      return true;
    });

    const attentionPriority = (player:Player) => {
      if (player.role === "chaos") return 6;
      const status = player.currentMission?.status;
      if (status === "guessed" || status === "failed") return 0;
      if (status === "cancelled") return 1;
      if (status === "completed") return 2;
      if (!player.currentMission) return 3;
      if (status === "active") return 4;
      return 5;
    };

    return [...filtered].sort((a,b) => {
      if (playerSort === "attention") {
        const diff = attentionPriority(a) - attentionPriority(b);
        if (diff !== 0) return diff;
        return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
      }
      if (playerSort === "number") {
        return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
      }
      if (playerSort === "name") return a.name.localeCompare(b.name, "lt");
      if (playerSort === "score") return b.score - a.score;
      return 0;
    });
  }, [state.players, playerFilter, playerSort]);

  function showToast(message:string) { setToast(message); }
  function showInfo(title:string, message:string) {
    setDialog({title,message,confirmLabel:"Gerai"});
  }
  function showConfirm(title:string,message:string,onConfirm:()=>void,danger=false,confirmLabel="Patvirtinti") {
    setDialog({title,message,onConfirm,danger,confirmLabel,cancelLabel:"Atšaukti"});
  }

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    const p: Player = { id: uid(), name, role: "agent", score: 0, accusationTokens: 2, completedMissionCount: 0, isHost: false };
    setState(s => addLog({ ...s, players: [...s.players, p] }, `Pridėtas žaidėjas: ${name}`));
    setNewName("");
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    setState(s => ({ ...s, players: s.players.map(p => p.id === id ? { ...p, ...patch } : p) }));
  }

  function setHost(id: string, makeHost: boolean) {
    setState(s => addLog({
      ...s,
      players: s.players.map(p => ({
        ...p,
        isHost: makeHost ? p.id === id : (p.id === id ? false : p.isHost)
      }))
    }, makeHost
      ? `${s.players.find(p=>p.id===id)?.name || "Žaidėjas"} pažymėtas kaip Vedėjas / Agentas.`
      : `${s.players.find(p=>p.id===id)?.name || "Žaidėjas"} nebėra Vedėjas.`));
  }

  function deletePlayer(id: string) {
    const player = state.players.find(x => x.id === id);
    if (!player) return;
    showConfirm("Pašalinti žaidėją?",
      `Ar tikrai nori pašalinti ${player.name}? Jo taškai, misija ir žaidimo duomenys bus pašalinti.`,
      () => {
        setState(s => addLog({...s,players:s.players.filter(x=>x.id!==id)},`Pašalintas žaidėjas: ${player.name}`));
        setSelectedPlayerId(null);
        showToast(`${player.name} pašalintas.`);
      }, true, "Pašalinti");
  }

  function assignMission(
    player: Player, missionId: string, x?: string, y?: string,
    options: {allowUsed?:boolean; replaceActive?:boolean}={}
  ) {
    const m=missions.find(item=>item.id===missionId);
    if (!m) { showInfo("Kortelė nerasta","Tokios misijos kortelės nėra."); return; }

    if (state.usedMissionIds.includes(m.id) && !options.allowUsed) {
      showConfirm("Kortelė jau panaudota",
        `${m.id} jau buvo panaudota šiame žaidime. Vis tiek priskirti?`,
        ()=>assignMission(player,missionId,x,y,{...options,allowUsed:true}),
        false,"Vis tiek priskirti");
      return;
    }

    if (player.currentMission?.status==="active" && !options.replaceActive) {
      showConfirm("Pakeisti aktyvią misiją?",
        `${player.name} jau turi aktyvią misiją ${player.currentMission.missionId}. Vis tiek pakeisti ją nauja?`,
        ()=>assignMission(player,missionId,x,y,{...options,replaceActive:true}),
        false,"Pakeisti misiją");
      return;
    }

    let rendered=m.text;
    if (x) rendered=rendered.replaceAll("[X]",x);
    if (y) rendered=rendered.replaceAll("[Y]",y);

    setState(s=>addLog({
      ...s,
      usedMissionIds:s.usedMissionIds.includes(m.id)?s.usedMissionIds:[...s.usedMissionIds,m.id],
      players:s.players.map(p=>p.id===player.id?{
        ...p,currentMission:{missionId:m.id,text:rendered,points:m.points,x,y,status:"active",assignedAt:Date.now()}
      }:p)
    },`${player.name} gavo misiją ${m.id} (${m.points} tšk.)`));
    showToast(`✅ ${m.id} priskirta žaidėjui ${player.name}.`);
  }

  function assignRandomMission(player: Player, points: 1|2|3|5) {
    const available = missions.filter(m => m.points === points && !state.usedMissionIds.includes(m.id));
    if (!available.length) { showInfo("Misijų nebėra","Nebėra nepanaudotų šio sunkumo misijų."); return; }

    const m = available[Math.floor(Math.random()*available.length)];
    const candidates = state.players.filter(p => p.id !== player.id);
    const needsX = m.text.includes("[X]");
    const needsY = m.text.includes("[Y]");
    const needed = Number(needsX) + Number(needsY);

    if (candidates.length < needed) {
      showInfo("Nepakanka žaidėjų","Šiai misijai nepakanka kitų žaidėjų.");
      return;
    }

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const x = needsX ? shuffled[0]?.name : undefined;
    const y = needsY ? shuffled[needsX ? 1 : 0]?.name : undefined;
    assignMission(player, m.id, x, y);
  }

  function missionCompleted(player: Player) {
    if (!player.currentMission || player.currentMission.status!=="active") return;
    const pts=player.currentMission.points;
    const completedAfter=(player.completedMissionCount||0)+1;
    const earnsToken=completedAfter%3===0 && player.accusationTokens<3;

    setState(s=>{
      const live=s.players.find(p=>p.id===player.id);
      if (!live?.currentMission || live.currentMission.status!=="active") return s;
      const completed=(live.completedMissionCount||0)+1;
      const giveToken=completed%3===0 && live.accusationTokens<3;
      return addLog({
        ...s,
        players:s.players.map(p=>p.id===player.id?{
          ...p,score:p.score+pts,
          accusationTokens:giveToken?Math.min(3,p.accusationTokens+1):p.accusationTokens,
          completedMissionCount:completed,
          currentMission:{...p.currentMission!,status:"completed" as const}
        }:p)
      },`${live.name} įvykdė ${live.currentMission.missionId} ir gavo +${pts} tšk.${giveToken?" Taip pat atgavo +1 kaltinimą.":""}`);
    });

    showToast(earnsToken
      ? `🎯 ${player.name}: +${pts} tšk. ir +1 kaltinimas!`
      : `✅ ${player.name}: misija įvykdyta, +${pts} tšk.`);
  }

  function missionFailed(player: Player) {
    if (!player.currentMission) return;
    const missionId = player.currentMission.missionId;
    setState(s => addLog({
      ...s,
      players: s.players.map(p => p.id === player.id ? {
        ...p, currentMission: { ...p.currentMission!, status:"cancelled" }
      } : p)
    }, `${player.name} misija ${missionId} atšaukta vedėjo.`));
    showToast(`${missionId} pažymėta kaip ATŠAUKTA.`);
  }

  function makeChaos(player: Player) {
    if (player.isHost) {
      showInfo("Negalima paskirti", "Vedėjas / Agentas negali būti Chaoso Agentu.");
      return;
    }
    if (player.role === "chaos") {
      showInfo("Jau Chaoso Agentas", `${player.name} jau yra Chaoso Agentas.`);
      return;
    }

    const delay = 20*60*1000;
    setState(s => addLog({
      ...s,
      players: s.players.map(p => p.id === player.id ? {
        ...p,
        role:"chaos",
        currentMission: undefined,
        chaosSince:Date.now(),
        chaosActivatesAt:Date.now()+delay
      } : p)
    }, `${player.name} slapta tapo Chaoso Agentu.`));
    showToast(`💀 ${player.name} tapo Chaoso Agentu.`);
  }

  function assignChaosManually() {
    const player = state.players.find(p => p.id === chaosManualPlayerId);
    if (!player) {
      showInfo("Pasirink žaidėją", "Pasirink, kas taps Chaoso Agentu.");
      return;
    }
    makeChaos(player);
    setChaosAssignOpen(false);
    setChaosManualPlayerId("");
  }

  function assignRandomChaos() {
    const candidates = state.players.filter(p => !p.isHost && p.role !== "chaos");
    if (!candidates.length) {
      showInfo("Nėra kandidatų", "Nėra tinkamų žaidėjų, kuriuos būtų galima paskirti Chaoso Agentais.");
      return;
    }

    const count = Math.max(1, Math.min(Number(chaosAssignCount) || 1, candidates.length));
    const shuffled = [...candidates];
    for (let i=shuffled.length-1; i>0; i--) {
      const j=Math.floor(Math.random()*(i+1));
      [shuffled[i], shuffled[j]]=[shuffled[j], shuffled[i]];
    }
    const chosen = shuffled.slice(0,count);
    const now = Date.now();
    const delay = 20*60*1000;

    setState(s => addLog({
      ...s,
      players: s.players.map(p => chosen.some(c => c.id === p.id) ? {
        ...p,
        role:"chaos",
        currentMission: undefined,
        chaosSince:now,
        chaosActivatesAt:now+delay
      } : p)
    }, `Programa atsitiktinai paskyrė ${chosen.length} Chaoso Agent${chosen.length===1?"ą":"us"}: ${chosen.map(x=>x.name).join(", ")}.`));

    showToast(`💀 Atsitiktinai paskirta Chaoso Agentų: ${chosen.length}.`);
    setChaosAssignOpen(false);
  }

  function demoteChaos(player: Player) {
    setState(s => addLog({
      ...s,
      players: s.players.map(p => p.id === player.id ? {
        ...p, role:"agent", chaosSince:undefined, chaosActivatesAt:undefined
      } : p)
    }, `${player.name} nustojo būti Chaoso Agentu.`));
    showToast(`${player.name} grąžintas į Agentą.`);
  }

  function demaskChaosAndOfferReplacement(accuser: Player, accused: Player) {
    setState(s => {
      const liveAccuser = s.players.find(p => p.id === accuser.id);
      const liveAccused = s.players.find(p => p.id === accused.id);
      if (!liveAccuser || !liveAccused || liveAccused.role !== "chaos") return s;

      return addLog({
        ...s,
        players: s.players.map(p => {
          if (p.id === liveAccuser.id) {
            return { ...p, score: p.score + 2 };
          }
          if (p.id === liveAccused.id) {
            return {
              ...p,
              role:"agent",
              chaosSince:undefined,
              chaosActivatesAt:undefined,
            };
          }
          return p;
        })
      }, `${liveAccuser.name} demaskavo Chaoso Agentą ${liveAccused.name} (+2 tšk.). ${liveAccused.name} grąžintas į Agentą.`);
    });

    setDialog({
      title: `${accused.name} demaskuotas!`,
      message: `${accuser.name} gauna +2 taškus. ${accused.name} nuo šiol vėl yra Agentas.\n\nAr nori dabar paskirti naują Chaoso Agentą?`,
      confirmLabel: "Priskirti dabar",
      cancelLabel: "Padarysiu vėliau",
      onConfirm: () => {
        setChaosAssignMode("manual");
        setChaosAssignOpen(true);
      }
    });
  }

  function handleMissionAccusation(accuser: Player, accused: Player, correct: boolean) {
    setState(s => {
      const liveAccuser = s.players.find(p => p.id === accuser.id);
      const liveAccused = s.players.find(p => p.id === accused.id);
      if (!liveAccuser || !liveAccused) return s;

      if (liveAccuser.isHost) {
        showInfo("Kaltinimas negalimas", "Vedėjas / Agentas negali teikti kaltinimų, nes mato slaptą informaciją.");
        return s;
      }

      if (liveAccuser.accusationTokens <= 0) {
        showInfo("Nėra kaltinimų", `${liveAccuser.name} nebeturi kaltinimo žetonų.`);
        return s;
      }

      // Chaoso Agentas neturi misijos, todėl bet koks misijos kaltinimas jam automatiškai klaidingas.
      if (liveAccused.role === "chaos") {
        return addLog({
          ...s,
          players: s.players.map(p => {
            if (p.id === liveAccuser.id) {
              return { ...p, accusationTokens: Math.max(0, p.accusationTokens - 1) };
            }
            if (p.id === liveAccused.id) {
              return { ...p, score: p.score + 1 };
            }
            return p;
          })
        }, `${liveAccuser.name} klaidingai apkaltino Chaoso Agentą ${liveAccused.name} vykdant misiją. ${liveAccused.name} gauna +1 tšk., o ${liveAccuser.name} praranda 1 kaltinimą.`);
      }

      const updatedPlayers = s.players.map(p => {
        if (p.id === liveAccuser.id) {
          return {
            ...p,
            accusationTokens: correct ? Math.min(3, p.accusationTokens) : Math.max(0, p.accusationTokens - 1),
            score: correct ? p.score + 1 : p.score,
          };
        }

        if (correct && p.id === liveAccused.id && p.currentMission?.status === "active") {
          return {
            ...p,
            currentMission: { ...p.currentMission, status:"guessed" as const },
          };
        }

        return p;
      });

      return addLog(
        { ...s, players: updatedPlayers },
        correct
          ? `${liveAccuser.name} teisingai atspėjo ${liveAccused.name} misiją (+1 tšk.). ${liveAccused.name} misija ATSPĖTA.`
          : `${liveAccuser.name} klaidingai apkaltino ${liveAccused.name} dėl misijos ir prarado 1 kaltinimo žetoną.`
      );
    });
  }

  function handleChaosAccusation(accuser: Player, accused: Player, correct: boolean) {
    const liveAccuser = state.players.find(p => p.id === accuser.id);
    const liveAccused = state.players.find(p => p.id === accused.id);
    if (!liveAccuser || !liveAccused) return;

    if (liveAccuser.isHost) {
      showInfo("Kaltinimas negalimas", "Vedėjas / Agentas negali teikti kaltinimų, nes mato slaptą informaciją.");
      return;
    }

    if (liveAccuser.accusationTokens <= 0) {
      showInfo("Nėra kaltinimų", `${liveAccuser.name} nebeturi kaltinimo žetonų.`);
      return;
    }

    if (correct && liveAccused.role === "chaos") {
      demaskChaosAndOfferReplacement(liveAccuser, liveAccused);
      return;
    }

    setState(s => addLog({
      ...s,
      players: s.players.map(p => {
        if (p.id === liveAccuser.id) return { ...p, accusationTokens: Math.max(0, p.accusationTokens - 1) };
        if (liveAccused.role === "chaos" && p.id === liveAccused.id) return { ...p, score: p.score + 1 };
        return p;
      })
    }, liveAccused.role === "chaos"
      ? `${liveAccuser.name} klaidingai įvertino Chaoso kaltinimą prieš ${liveAccused.name}: prarado 1 kaltinimo žetoną, o ${liveAccused.name} gauna +1 tšk.`
      : `${liveAccuser.name} klaidingai apkaltino ${liveAccused.name} esant Chaoso Agentu ir prarado 1 kaltinimo žetoną.`));
  }

  function startNewGame() {
    setState(s => ({
      ...emptyState,
      startedAt: Date.now(),
      players: s.players.map(player => ({
        ...player,
        role: "agent",
        score: 0,
        accusationTokens: 2,
        completedMissionCount: 0,
        currentMission: undefined,
        chaosSince: undefined,
        chaosActivatesAt: undefined,
        isHost: player.isHost,
      })),
    }));
    setSelectedPlayerId(null);
    setTab("players");
    setConfirmMode(null);
    setToast("Naujas žaidimas pradėtas. Žaidėjai išsaugoti.");
  }

  function clearEverything() {
    clearState();
    setState({ ...emptyState, startedAt: Date.now() });
    setSelectedPlayerId(null);
    setTab("players");
    setConfirmMode(null);
    setToast("Visi žaidimo duomenys išvalyti.");
  }

  if (!loaded) return null;

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1 className="title">CHAOSO VAKARĖLIS</h1>
          <div className="subtitle">PLATELIUOSE · GAME MASTER</div>
        </div>
        <div className="row">
          <button className="btn" onClick={()=>setConfirmMode("new")}><Shuffle size={16}/> Naujas žaidimas</button>
          <button className="btn btn-red" onClick={()=>setConfirmMode("clear")}>Išvalyti viską</button>
        </div>
      </div>

      <div className="grid" style={{marginBottom:12}}>
        <div className="card"><div className="kpi">{state.players.length}</div><div className="kpi-label">žaidėjų</div></div>
        <div className="card"><div className="kpi">{state.players.filter(p=>p.role==="chaos").length}</div><div className="kpi-label">aktyvių Chaoso Agentų</div></div>
        <div className="card"><div className="kpi">{state.usedMissionIds.length}</div><div className="kpi-label">panaudotų misijų</div></div>
      </div>

      <nav className="nav">
        <button className={"btn "+(tab==="players"?"active":"")} onClick={()=>setTab("players")}><Users size={16}/> Žaidėjai{attentionCount>0 && <span className="navCount">{attentionCount}</span>}</button>
        <button className={"btn "+(tab==="accusations"?"active":"")} onClick={()=>setTab("accusations")}><Target size={16}/> Kaltinimai</button>
        <button className={"btn "+(tab==="chaos"?"active":"")} onClick={()=>setTab("chaos")}><Skull size={16}/> Chaos</button>
        <button className={"btn "+(tab==="leaders"?"active":"")} onClick={()=>setTab("leaders")}><Trophy size={16}/> Lyderiai</button>
        <button className={"btn "+(tab==="history"?"active":"")} onClick={()=>setTab("history")}><History size={16}/> Istorija</button>
      </nav>

      {tab==="players" && <>
        <div className="card" style={{marginBottom:12}}>
          <div className="row addPlayerRow">
            <input className="input" style={{flex:1,minWidth:0}} placeholder="Žaidėjo vardas" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPlayer()} />
            <button className="btn btn-accent" onClick={addPlayer}><Plus size={16}/> Pridėti</button>
          </div>
        </div>

        <div className="card playerToolbar" style={{marginBottom:12}}>
          <div className="toolbarGroup">
            <label>Filtruoti</label>
            <div className="filterChips">
              <button className={"chip "+(playerFilter==="all"?"chip-active":"")} onClick={()=>setPlayerFilter("all")}>Visi</button>
              <button className={"chip "+(playerFilter==="attention"?"chip-active":"")} onClick={()=>setPlayerFilter("attention")}>Reikia misijos {attentionCount>0 && `(${attentionCount})`}</button>
              <button className={"chip "+(playerFilter==="active"?"chip-active":"")} onClick={()=>setPlayerFilter("active")}>Aktyvios</button>
              <button className={"chip "+(playerFilter==="guessed"?"chip-active":"")} onClick={()=>setPlayerFilter("guessed")}>Atspėtos</button>
              <button className={"chip "+(playerFilter==="completed"?"chip-active":"")} onClick={()=>setPlayerFilter("completed")}>Įvykdytos</button>
              <button className={"chip "+(playerFilter==="chaos"?"chip-active":"")} onClick={()=>setPlayerFilter("chaos")}>Chaos</button>
            </div>
          </div>
          <div className="toolbarGroup sortGroup">
            <label>Rikiuoti</label>
            <select className="input compactSelect" value={playerSort} onChange={e=>setPlayerSort(e.target.value as any)}>
              <option value="attention">Reikia dėmesio</option>
              <option value="number">Pagal numerį</option>
              <option value="name">Pagal vardą</option>
              <option value="score">Pagal taškus</option>
            </select>
          </div>
        </div>

        <div className="grid">
          {visiblePlayers.map((p)=>(
            <div className={"card "+(needsMission(p)?"needsAttention":"")} key={p.id}>
              <div className="player">
                <div>
                  <strong>{state.players.findIndex(original=>original.id===p.id)+1}. {p.name}</strong>
                  <div className="row" style={{marginTop:6}}>
                    <span className={"badge "+(p.role==="chaos"?"badge-chaos":"badge-agent")}>{p.role==="chaos"?"CHAOS":"AGENTAS"}</span>
                    {p.isHost && <span className="badge">VEDĖJAS</span>}
                    <span className="badge">{p.score} tšk.</span>
                    <span className="badge">{p.accusationTokens}/3 kalt.</span>
                    <span className="badge">{(p.completedMissionCount||0)%3}/3 iki +1</span>
                  </div>
                </div>
                <button className="btn" onClick={()=>setSelectedPlayerId(p.id)}>Valdyti</button>
              </div>
              {p.currentMission && (
                <div className="missionbox" style={{marginTop:10}}>
                  <div className="row">
                    <span className="small muted">{p.currentMission.missionId} · {p.currentMission.points} tšk.</span>
                    <MissionStatusBadge status={p.currentMission.status}/>
                  </div>
                  {p.currentMission.status==="active" && <div style={{marginTop:6}}>{p.currentMission.text}</div>}
                </div>
              )}
            </div>
          ))}
          {!visiblePlayers.length && <div className="card muted">Pagal pasirinktą filtrą žaidėjų nėra.</div>}
        </div>
      </>}

      {tab==="accusations" && <AccusationPanel players={state.players} onMission={handleMissionAccusation} onChaos={handleChaosAccusation} onToast={showToast} />}

      {tab==="chaos" && <>
        <div className="card" style={{marginBottom:12}}>
          <div className="row" style={{justifyContent:"space-between"}}>
            <div>
              <h3 style={{margin:0}}>Chaoso Agentų valdymas</h3>
              <div className="small muted" style={{marginTop:4}}>Priskirk konkretų žaidėją arba leisk programai parinkti atsitiktinai.</div>
            </div>
            <button className="btn btn-accent" onClick={()=>setChaosAssignOpen(true)}><Skull size={16}/> Priskirti Chaoso Agentą</button>
          </div>
        </div>
        <div className="grid">
        {state.players.filter(p=>p.role==="chaos").map(p=>(
          <div className="card" key={p.id}>
            <div className="row"><Skull/><strong>{p.name}</strong><span className="badge badge-chaos">CHAOS</span></div>
            <div className="stat" style={{marginTop:8}}>Nuo: {p.chaosSince ? prettyTime(p.chaosSince) : "—"}</div>
            <div className="stat">Aktyvuotis nuo: {p.chaosActivatesAt ? prettyTime(p.chaosActivatesAt) : "—"}</div>
            <button className="btn btn-red" style={{marginTop:10}} onClick={()=>demoteChaos(p)}>Demaskuotas / grąžinti į Agentą</button>
          </div>
        ))}
        {!state.players.some(p=>p.role==="chaos") && <div className="card muted">Šiuo metu nėra Chaoso Agentų.</div>}
        </div>
      </>}

      {tab==="leaders" && <div className="card">
        <div className="row leaderHeader" style={{justifyContent:"space-between",marginBottom:8}}>
          <div className="row"><Trophy/><h3 style={{margin:0}}>Lyderiai</h3></div>
          <div className="row leaderActions">
            <button className="btn" onClick={()=>setScoreboardOpen(true)}><Smartphone size={16}/> Scoreboard vaizdas</button>
            <button className="btn" onClick={async()=>{
              const lines=leaderboard.map((p,i)=>`${i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`} ${p.name} — ${p.score} tšk.`);
              const text=`🏆 CHAOSO VAKARĖLIS\n${lines.join("\n")}`;
              try { await navigator.clipboard.writeText(text); showToast("📋 Rezultatai nukopijuoti"); }
              catch { showInfo("Nepavyko nukopijuoti", "Naršyklė neleido pasiekti iškarpinės."); }
            }}><Copy size={16}/> Kopijuoti rezultatus</button>
          </div>
        </div>
        <div className="leaderList">
          {leaderboard.map((p,i)=>(
            <div key={p.id} className={"leaderRow "+(i<3?`leader-${i+1}`:i<5?"leader-top5":"")}>
              <div className="leaderPlace">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</div>
              <div className="leaderName">
                <strong>{p.name}</strong>
                <div className="row" style={{marginTop:4}}>
                  <span className={"badge "+(p.role==="chaos"?"badge-chaos":"badge-agent")}>{p.role==="chaos"?"CHAOS":"AGENTAS"}</span>
                  {p.isHost && <span className="badge">VEDĖJAS</span>}
                </div>
              </div>
              <div className="leaderScore">{p.score} tšk.</div>
            </div>
          ))}
        </div>
      </div>}

      {tab==="history" && <>
        <div className="card">
          <h3>Žaidimo istorija</h3>
          {state.logs.map(l=><div className="log" key={l.id}><span className="muted">{prettyTime(l.time)}</span> · {l.text}</div>)}
          {!state.logs.length && <div className="muted">Įrašų dar nėra.</div>}
        </div>
      </>}

      {scoreboardOpen && (
        <div className="scoreboardBackdrop" onMouseDown={()=>setScoreboardOpen(false)}>
          <div className="scoreboardSheet" onMouseDown={e=>e.stopPropagation()}>
            <div className="scoreboardTop">
              <div><div className="scoreboardEyebrow">CHAOSO VAKARĖLIS</div><h2>🏆 SCOREBOARD</h2></div>
              <button className="scoreboardClose" onClick={()=>setScoreboardOpen(false)}><X size={20}/></button>
            </div>
            <div className="scoreboardRows">
              {leaderboard.map((p,i)=><div className={`scoreboardRow ${i<3?`podium p${i+1}`:i<5?"topfive":""}`} key={p.id}>
                <span className="scoreboardPlace">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</span>
                <strong className="scoreboardName">{p.name}</strong>
                <strong className="scoreboardScore">{p.score} tšk.</strong>
              </div>)}
            </div>
            <div className="scoreboardFooter">PlatELyn · Chaoso vakarėlis</div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {chaosAssignOpen && (
        <ChaosAssignModal
          players={state.players}
          mode={chaosAssignMode}
          setMode={setChaosAssignMode}
          count={chaosAssignCount}
          setCount={setChaosAssignCount}
          selectedPlayerId={chaosManualPlayerId}
          setSelectedPlayerId={setChaosManualPlayerId}
          onClose={()=>setChaosAssignOpen(false)}
          onManual={assignChaosManually}
          onRandom={assignRandomChaos}
        />
      )}

      {dialog && (
        <AppDialog dialog={dialog} onClose={()=>setDialog(null)} onConfirm={()=>{
          const action=dialog.onConfirm; setDialog(null); action?.();
        }}/>
      )}

      {confirmMode && (
        <ResetConfirmModal
          mode={confirmMode}
          onClose={()=>setConfirmMode(null)}
          onConfirm={confirmMode==="new" ? startNewGame : clearEverything}
        />
      )}

      {selected && (
        <PlayerModal player={selected} players={state.players} onClose={()=>setSelectedPlayerId(null)}
          onUpdate={patch=>updatePlayer(selected.id, patch)}
          onSetHost={(value:boolean)=>setHost(selected.id,value)}
          onDelete={()=>deletePlayer(selected.id)}
          onAssignRandom={assignRandomMission}
          onAssignManual={(missionId:string,x?:string,y?:string)=>assignMission(selected,missionId,x,y)}
          onInfo={showInfo}
          usedMissionIds={state.usedMissionIds}
          onComplete={()=>missionCompleted(selected)}
          onFail={()=>missionFailed(selected)}
          onChaos={()=>makeChaos(selected)}
          onDemote={()=>demoteChaos(selected)}
        />
      )}
    </main>
  );
}

function PlayerModal({player, players, onClose, onUpdate, onSetHost, onDelete, onAssignRandom, onAssignManual, onInfo, usedMissionIds, onComplete, onFail, onChaos, onDemote}: any) {
  const [mode,setMode]=useState<"random"|"manual">("random");
  const [points,setPoints]=useState<1|2|3|5>(1);
  const [x,setX]=useState("");
  const [y,setY]=useState("");
  const [manualCode,setManualCode]=useState("");
  const others=players.filter((p:Player)=>p.id!==player.id);

  const normalizedCode = manualCode.trim().toUpperCase();
  const manualMission = missions.find(m => m.id === normalizedCode);
  const manualUsed = manualMission ? usedMissionIds.includes(manualMission.id) : false;

  function needsX(text?: string) { return !!text?.includes("[X]"); }
  function needsY(text?: string) { return !!text?.includes("[Y]"); }

  function assignManual() {
    if (!manualMission) {
      onInfo("Kortelė nerasta","Įvesk galiojantį kortelės kodą, pvz. M037.");
      return;
    }
    if (needsX(manualMission.text) && !x) {
      onInfo("Trūksta taikinio","Šiai misijai reikia parinkti [X].");
      return;
    }
    if (needsY(manualMission.text) && !y) {
      onInfo("Trūksta taikinio","Šiai misijai reikia parinkti [Y].");
      return;
    }
    onAssignManual(manualMission.id, x||undefined, y||undefined);
  }

  function assignRandom() {
    onAssignRandom(player, points);
  }

  return <div className="modalBackdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <h2 style={{margin:0}}>{player.name}</h2>
        <button className="btn" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="row" style={{marginTop:10}}>
        <span className="badge">{player.score} tšk.</span>
        <span className="badge">{player.accusationTokens}/3 kaltinimų</span>
        <span className="badge">{(player.completedMissionCount||0)%3}/3 iki +1</span>
        <span className={"badge "+(player.role==="chaos"?"badge-chaos":"badge-agent")}>{player.role==="chaos"?"CHAOS":"AGENTAS"}</span>
        {player.isHost && <span className="badge">VEDĖJAS</span>}
      </div>

      <hr/>
      <div className="grid">
        <div>
          <label>Taškai</label>
          <input className="input" type="number" value={player.score} onChange={e=>onUpdate({score:Number(e.target.value)})}/>
        </div>
        <div>
          <label>Kaltinimų žetonai</label>
          <select className="input" value={player.accusationTokens} onChange={e=>onUpdate({accusationTokens:Number(e.target.value)})}>
            <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
          </select>
        </div>
      </div>

      <hr/>
      <div className="stack">
        <label>Vedėjo statusas</label>
        <button className={"btn "+(player.isHost?"btn-green":"")} onClick={()=>onSetHost(!player.isHost)}>
          {player.isHost ? "✓ Vedėjas / Agentas" : "Pažymėti kaip Vedėją / Agentą"}
        </button>
        {player.isHost && <div className="small muted">
          Vedėjas gali vykdyti misijas, būti kitų taikiniu ir rinkti misijų taškus, tačiau negali teikti kaltinimų.
        </div>}
      </div>

      <hr/>
      {player.role==="agent"
        ? <button className="btn btn-accent" onClick={onChaos} disabled={player.isHost}><Skull size={16}/> Padaryti Chaoso Agentu</button>
        : <button className="btn btn-red" onClick={onDemote}>Grąžinti į Agentą</button>}
      {player.isHost && <div className="small muted" style={{marginTop:6}}>Vedėjas negali būti Chaoso Agentu.</div>}

      <hr/>
      <h3>Dabartinė misija</h3>
      {player.currentMission ? <div className="missionbox">
        <div className="row">
          <span className="small muted">{player.currentMission.missionId} · {player.currentMission.points} tšk.</span>
          <MissionStatusBadge status={player.currentMission.status}/>
        </div>
        <p>{player.currentMission.text}</p>
        {player.currentMission.status==="active" && <div className="row">
          <button className="btn btn-green" onClick={onComplete}><Check size={16}/> Įvykdyta</button>
          <button className="btn btn-red" onClick={onFail}><X size={16}/> Atšaukti misiją</button>
        </div>}
      </div> : <div className="muted">Nėra aktyvios misijos.</div>}

      {player.role==="agent" && <>
        <hr/>
        <h3>Priskirti misiją</h3>

        <div className="row" style={{marginBottom:10}}>
          <button className={"btn "+(mode==="random"?"btn-accent":"")} onClick={()=>setMode("random")}>
            <Shuffle size={16}/> Programa parenka
          </button>
          <button className={"btn "+(mode==="manual"?"btn-accent":"")} onClick={()=>setMode("manual")}>
            <Target size={16}/> Priskirti ištrauktą kortelę
          </button>
        </div>

        {mode==="random" ? <>
          <div>
            <label>Misijos vertė</label>
            <select className="input" value={points} onChange={e=>setPoints(Number(e.target.value) as any)}>
              <option value={1}>1 taškas</option>
              <option value={2}>2 taškai</option>
              <option value={3}>3 taškai</option>
              <option value={5}>5 taškai</option>
            </select>
            <div className="small muted" style={{marginTop:7}}>
              Programa pati parinks nepanaudotą misiją ir atsitiktinius [X] / [Y] žaidėjus, jei jų reikės.
            </div>
          </div>
          <button className="btn btn-blue" style={{marginTop:10}} onClick={assignRandom}>
            <Shuffle size={16}/> Išrinkti atsitiktinę misiją
          </button>
        </> : <>
          <div className="grid">
            <div>
              <label>Kortelės kodas</label>
              <input
                className="input"
                value={manualCode}
                onChange={e=>setManualCode(e.target.value)}
                placeholder="Pvz. M037"
                autoCapitalize="characters"
              />
            </div>
            <div>
              <label>[X]</label>
              <select className="input" value={x} onChange={e=>setX(e.target.value)}>
                <option value="">—</option>{others.map((p:Player)=><option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label>[Y]</label>
              <select className="input" value={y} onChange={e=>setY(e.target.value)}>
                <option value="">—</option>{others.map((p:Player)=><option key={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {normalizedCode && <div className="missionbox" style={{marginTop:10}}>
            {manualMission ? <>
              <div className="small muted">
                {manualMission.id} · {manualMission.points} tšk.
                {manualUsed ? " · JAU PANAUDOTA" : ""}
              </div>
              <div style={{marginTop:4}}>{manualMission.text}</div>
            </> : <div style={{color:"var(--red)"}}>Kortelė nerasta. Naudok kodą M001–M130.</div>}
          </div>}

          <button className="btn btn-green" style={{marginTop:10}} disabled={!manualMission} onClick={assignManual}>
            <Check size={16}/> Priskirti šią kortelę
          </button>
        </>}
      </>}

      <hr/>
      <button className="btn btn-red" onClick={onDelete}>Pašalinti žaidėją</button>
    </div>
  </div>
}

function PlayerPickerModal({title,players,selectedId,showTokens,onClose,onSelect}:any) {
  const [query,setQuery]=useState("");
  const filtered=players.filter((p:Player)=>p.name.toLocaleLowerCase("lt-LT").includes(query.toLocaleLowerCase("lt-LT")));

  return <div className="modalBackdrop" onMouseDown={onClose}>
    <div className="modal pickerModal" onMouseDown={e=>e.stopPropagation()}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <h2 style={{margin:0}}>{title}</h2>
        <button className="btn" onClick={onClose}><X size={18}/></button>
      </div>
      <input
        className="input"
        style={{marginTop:12}}
        placeholder="Ieškoti žaidėjo..."
        value={query}
        onChange={e=>setQuery(e.target.value)}
        autoFocus
      />
      <div className="pickerList">
        {filtered.map((player:Player)=>(
          <button
            key={player.id}
            className={"pickerItem "+(selectedId===player.id?"pickerItemActive":"")}
            onClick={()=>onSelect(player.id)}
          >
            <span>
              <strong>{player.name}</strong>
              <span className="pickerMeta">
                {player.role==="chaos" ? "CHAOS" : "AGENTAS"}
                {showTokens ? ` · ${player.accusationTokens}/3 kalt.` : ""}
              </span>
            </span>
            {selectedId===player.id && <Check size={18}/>}
          </button>
        ))}
        {!filtered.length && <div className="muted" style={{padding:12}}>Žaidėjų nerasta.</div>}
      </div>
    </div>
  </div>
}

function ChaosAssignModal({players,mode,setMode,count,setCount,selectedPlayerId,setSelectedPlayerId,onClose,onManual,onRandom}:any) {
  const candidates=players.filter((p:Player)=>!p.isHost && p.role!=="chaos");
  const maxCount=Math.max(1,candidates.length);

  return <div className="modalBackdrop" onMouseDown={onClose}>
    <div className="modal confirmModal" onMouseDown={e=>e.stopPropagation()}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <h2 style={{margin:0}}>Priskirti Chaoso Agentą</h2>
        <button className="btn" onClick={onClose}><X size={18}/></button>
      </div>

      <p className="muted">Vedėjas ir jau esami Chaoso Agentai į pasirinkimą neįtraukiami.</p>

      <div className="row" style={{marginBottom:14}}>
        <button className={"btn "+(mode==="manual"?"btn-accent":"")} onClick={()=>setMode("manual")}>Pasirinkti rankiniu būdu</button>
        <button className={"btn "+(mode==="random"?"btn-accent":"")} onClick={()=>setMode("random")}><Shuffle size={16}/> Programa parenka</button>
      </div>

      {mode==="manual" ? <>
        <label>Kas taps Chaoso Agentu?</label>
        <select className="input" value={selectedPlayerId} onChange={e=>setSelectedPlayerId(e.target.value)}>
          <option value="">Pasirink...</option>
          {candidates.map((p:Player)=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="row" style={{justifyContent:"flex-end",marginTop:16}}>
          <button className="btn" onClick={onClose}>Atšaukti</button>
          <button className="btn btn-accent" disabled={!selectedPlayerId} onClick={onManual}>Priskirti</button>
        </div>
      </> : <>
        <label>Kiek Chaoso Agentų parinkti?</label>
        <input
          className="input"
          type="number"
          min={1}
          max={maxCount}
          value={count}
          onChange={e=>setCount(Math.max(1,Math.min(maxCount,Number(e.target.value)||1)))}
        />
        <div className="small muted" style={{marginTop:7}}>Galimi kandidatai: {candidates.length}</div>
        <div className="row" style={{justifyContent:"flex-end",marginTop:16}}>
          <button className="btn" onClick={onClose}>Atšaukti</button>
          <button className="btn btn-accent" disabled={!candidates.length} onClick={onRandom}><Shuffle size={16}/> Parinkti atsitiktinai</button>
        </div>
      </>}
    </div>
  </div>
}

function AppDialog({dialog,onClose,onConfirm}:any) {
  return <div className="modalBackdrop" onMouseDown={onClose}>
    <div className="modal confirmModal" onMouseDown={e=>e.stopPropagation()}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <h2 style={{margin:0}}>{dialog.title}</h2>
        <button className="btn" onClick={onClose}><X size={18}/></button>
      </div>
      <p className="muted">{dialog.message}</p>
      <div className="row" style={{justifyContent:"flex-end",marginTop:16}}>
        {dialog.cancelLabel && <button className="btn" onClick={onClose}>{dialog.cancelLabel}</button>}
        <button className={"btn "+(dialog.danger?"btn-red":"btn-accent")} onClick={onConfirm}>
          {dialog.confirmLabel||"Gerai"}
        </button>
      </div>
    </div>
  </div>
}

function MissionStatusBadge({status}:{status:string}) {
  const map: Record<string,{label:string,cls:string}> = {
    active: { label:"AKTYVI", cls:"status-active" },
    completed: { label:"ĮVYKDYTA", cls:"status-completed" },
    guessed: { label:"ATSPĖTA", cls:"status-guessed" },
    cancelled: { label:"ATŠAUKTA", cls:"status-cancelled" },
    failed: { label:"ATSPĖTA", cls:"status-guessed" }, // suderinamumas su senesniu localStorage
  };
  const item=map[status] || {label:status.toUpperCase(),cls:"status-cancelled"};
  return <span className={"statusBadge "+item.cls}>{item.label}</span>;
}

function ResetConfirmModal({mode,onClose,onConfirm}:any) {
  const isClear=mode==="clear";
  const required=isClear ? "IŠVALYTI" : "CHAOSAS";
  const [checked,setChecked]=useState(false);
  const [text,setText]=useState("");
  const valid=checked && text.trim().toLocaleUpperCase("lt-LT")===required;

  return <div className="modalBackdrop" onMouseDown={onClose}>
    <div className="modal confirmModal" onMouseDown={e=>e.stopPropagation()}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <h2 style={{margin:0}}>{isClear ? "Išvalyti viską?" : "Pradėti naują žaidimą?"}</h2>
        <button className="btn" onClick={onClose}><X size={18}/></button>
      </div>
      <p className="muted">
        {isClear
          ? "Bus negrįžtamai ištrinti žaidėjai, taškai, misijos, rolės ir visa istorija."
          : "Žaidėjai ir Vedėjo statusas liks, tačiau taškai, misijos, Chaoso rolės, kaltinimai ir istorija bus pradėti iš naujo."}
      </p>
      <label className="confirmCheck">
        <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>
        <span>{isClear ? "Suprantu, kad bus ištrinti ir visi žaidėjai." : "Suprantu, kad dabartinio žaidimo progresas bus ištrintas."}</span>
      </label>
      <div style={{marginTop:14}}>
        <label>Patvirtinimui įrašyk <strong>{required}</strong></label>
        <input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder={required}/>
      </div>
      <div className="row" style={{marginTop:16,justifyContent:"flex-end"}}>
        <button className="btn" onClick={onClose}>Atšaukti</button>
        <button className={"btn "+(isClear?"btn-red":"btn-accent")} disabled={!valid} onClick={onConfirm}>
          {isClear ? "Išvalyti viską" : "Pradėti naują žaidimą"}
        </button>
      </div>
    </div>
  </div>
}

function AccusationPanel({players,onMission,onChaos,onToast}: any) {
  const [accuserId,setAccuserId]=useState("");
  const [accusedId,setAccusedId]=useState("");
  const [type,setType]=useState<"mission"|"chaos">("mission");
  const [showTruth,setShowTruth]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [picker,setPicker]=useState<"accuser"|"accused"|null>(null);

  function finishAccusation(correct:boolean) {
    if (!accuser || !accused || submitting) return;
    setSubmitting(true);

    if (type==="mission") {
      onMission(accuser, accused, correct);
      if (accused.role==="chaos") {
        onToast(`💀 ${accused.name} išprovokavo klaidingą misijos kaltinimą ir gauna +1 tšk.`);
      } else {
        onToast(correct ? "✅ Kaltinimas užregistruotas: pataikė." : "✅ Kaltinimas užregistruotas: nepataikė.");
      }
    } else {
      onChaos(accuser, accused, correct);
      onToast(correct ? "✅ Chaoso Agentas demaskuotas." : "✅ Chaoso kaltinimas užregistruotas: nepataikė.");
    }

    setShowTruth(false);
    setAccuserId("");
    setAccusedId("");
    setTimeout(()=>setSubmitting(false),900);
  }
  const accuser=players.find((p:Player)=>p.id===accuserId);
  const accused=players.find((p:Player)=>p.id===accusedId);

  return <div className="card">
    <h3>Naujas kaltinimas</h3>
    <div className="accusationGrid">
      <div>
        <label>Kas kaltina?</label>
        <button className="pickerButton" onClick={()=>setPicker("accuser")}>
          <span>{accuser ? `${accuser.name} (${accuser.accusationTokens}/3)` : "Pasirink..."}</span>
          <span>›</span>
        </button>
      </div>
      <div>
        <label>Ką kaltina?</label>
        <button className="pickerButton" onClick={()=>setPicker("accused")}>
          <span>{accused ? accused.name : "Pasirink..."}</span>
          <span>›</span>
        </button>
      </div>
      <div>
        <label>Tipas</label>
        <select className="input" value={type} onChange={e=>{setType(e.target.value as any);setShowTruth(false)}}>
          <option value="mission">Misijos kaltinimas</option>
          <option value="chaos">Chaoso Agento kaltinimas</option>
        </select>
      </div>
    </div>
    <p className="small muted">Vedėjas / Agentas šiame sąraše nerodomas ir kaltinimų teikti negali.</p>
    {accuser && accuser.accusationTokens<=0 && <p style={{color:"var(--red)"}}>Šis žaidėjas neturi kaltinimo žetonų.</p>}
    {accused && <>
      <hr/>
      <button className="btn" onClick={()=>setShowTruth(v=>!v)}><AlertTriangle size={16}/> {showTruth?"Slėpti tiesą":"Rodyti tiesą organizatoriui"}</button>
      {showTruth && <div className="missionbox" style={{marginTop:10}}>
        {type==="mission" ? <>
          <div className="small muted">Tikroji {accused.name} misija</div>
          <div>{accused.currentMission?.text || "Aktyvios misijos nėra."}</div>
        </> : <>
          <div className="small muted">Tikroji rolė</div>
          <div><strong>{accused.role==="chaos"?"CHAOSO AGENTAS":"AGENTAS"}</strong></div>
        </>}
      </div>}
      <div className="row" style={{marginTop:12}}>
        {type==="mission" && accused.role==="chaos" ? (
          <button className="btn btn-accent" disabled={submitting || !accuser || accuser.accusationTokens<=0} onClick={()=>finishAccusation(false)}>
            Užregistruoti klaidingą kaltinimą
          </button>
        ) : <>
          <button className="btn btn-green" disabled={submitting || !accuser || accuser.accusationTokens<=0} onClick={()=>finishAccusation(true)}>Pataikė</button>
          <button className="btn btn-red" disabled={submitting || !accuser || accuser.accusationTokens<=0} onClick={()=>finishAccusation(false)}>Nepataikė</button>
        </>}
      </div>
    </>}
    {picker && (
      <PlayerPickerModal
        title={picker==="accuser" ? "Kas kaltina?" : "Ką kaltina?"}
        players={picker==="accuser"
          ? players.filter((p:Player)=>!p.isHost)
          : players.filter((p:Player)=>p.id!==accuserId)}
        selectedId={picker==="accuser" ? accuserId : accusedId}
        showTokens={picker==="accuser"}
        onClose={()=>setPicker(null)}
        onSelect={(id:string)=>{
          if (picker==="accuser") {
            setAccuserId(id);
            if (id===accusedId) setAccusedId("");
          } else {
            setAccusedId(id);
          }
          setShowTruth(false);
          setPicker(null);
        }}
      />
    )}
  </div>
}
