import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5501/api';

export default function App() {
  const [view, setView] = useState('gantt');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [phases, setPhases] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [p, t, ph, m] = await Promise.all([
        fetch(`${API_URL}/projects`).then(r => r.json()),
        fetch(`${API_URL}/tasks`).then(r => r.json()),
        fetch(`${API_URL}/phases`).then(r => r.json()),
        fetch(`${API_URL}/team-members`).then(r => r.json())
      ]);
      setProjects(p); setTasks(t); setPhases(ph); setTeamMembers(m);
      if (p.length > 0 && !selectedProject) setSelectedProject(p[0].id);
      setLoading(false);
    } catch (error) { 
      alert('❌ Error loading data. Make sure backend is running!');
      setLoading(false); 
    }
  };

  const saveTask = async (data) => {
    try {
      const url = editTask ? `${API_URL}/tasks/${editTask.id}` : `${API_URL}/tasks`;
      const res = await fetch(url, {
        method: editTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert(editTask ? '✅ Task Updated!' : '✅ Task Added!');
        setShowTaskModal(false); setEditTask(null);
        await fetchData();
      } else alert('❌ Failed to save task');
    } catch (error) { alert('❌ Error: ' + error.message); }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('⚠️ Delete this task?')) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) { alert('✅ Task Deleted!'); setShowTaskModal(false); setEditTask(null); await fetchData(); }
      else alert('❌ Failed to delete');
    } catch (error) { alert('❌ Error: ' + error.message); }
  };

  const filtered = selectedProject ? tasks.filter(t => t.project_id === selectedProject) : tasks;
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'20px'}}>⏳ Loading...</div>;

  return (
    <div style={{fontFamily:'Arial,sans-serif',background:'#f5f5f5',minHeight:'100vh'}}>
      <div style={{background:'white',borderBottom:'1px solid #ddd',padding:'20px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'20px'}}>
          <h1 style={{margin:0,fontSize:'24px'}}>Video Production Projects</h1>
          <button onClick={()=>{setEditTask(null);setShowTaskModal(true);}} style={{background:'#4285f4',color:'white',border:'none',padding:'10px 20px',borderRadius:'4px',cursor:'pointer',fontWeight:600}}>+ Add Task</button>
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <select value={selectedProject||''} onChange={(e)=>setSelectedProject(Number(e.target.value))} style={{padding:'8px',border:'1px solid #ddd',borderRadius:'4px'}}>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{display:'flex',gap:'5px',background:'#f0f0f0',padding:'4px',borderRadius:'4px'}}>
            <button onClick={()=>setView('gantt')} style={{padding:'8px 16px',border:'none',background:view==='gantt'?'white':'transparent',borderRadius:'4px',cursor:'pointer'}}>Gantt</button>
            <button onClick={()=>setView('kanban')} style={{padding:'8px 16px',border:'none',background:view==='kanban'?'white':'transparent',borderRadius:'4px',cursor:'pointer'}}>Kanban</button>
            <button onClick={()=>setView('list')} style={{padding:'8px 16px',border:'none',background:view==='list'?'white':'transparent',borderRadius:'4px',cursor:'pointer'}}>List</button>
          </div>
        </div>
      </div>
      <div style={{padding:'20px'}}>
        {view==='gantt'&&<GanttView tasks={filtered} phases={phases} onClick={(t)=>{setEditTask(t);setShowTaskModal(true);}} onAdd={()=>{setEditTask(null);setShowTaskModal(true);}}/>}
        {view==='kanban'&&<KanbanView tasks={filtered} onClick={(t)=>{setEditTask(t);setShowTaskModal(true);}}/>}
        {view==='list'&&<ListView tasks={filtered} phases={phases} onEdit={(t)=>{setEditTask(t);setShowTaskModal(true);}} onDelete={deleteTask}/>}
      </div>
      {showTaskModal&&<TaskModal task={editTask} phases={phases} members={teamMembers} projectId={selectedProject} onClose={()=>{setShowTaskModal(false);setEditTask(null);}} onSave={saveTask} onDelete={editTask?()=>deleteTask(editTask.id):null}/>}
    </div>
  );
}

function GanttView({tasks,phases,onClick,onAdd}){
  const grouped=phases.reduce((a,p)=>{a[p.name]=tasks.filter(t=>t.phase_id===p.id);return a;},{});
  const getPos=(s,e)=>{const st=new Date(s),en=new Date(e),ps=new Date('2026-01-08');const sd=Math.floor((st-ps)/86400000),du=Math.floor((en-st)/86400000)+1;return{left:`${(sd/7)*14.28}%`,width:`${(du/7)*14.28}%`};};
  const getSt=(s)=>({'Done':{bg:'#4285f4',c:'#fff'},'In Progress':{bg:'#fbbc04',c:'#333'},'Testing':{bg:'#34a853',c:'#fff'},'Open':{bg:'#9e9e9e',c:'#fff'}}[s]||{bg:'#9e9e9e',c:'#fff'});
  return(
    <div style={{background:'white',borderRadius:'8px',overflowX:'auto',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
      <div style={{minWidth:'1400px'}}>
        <div style={{display:'flex',borderBottom:'1px solid #ddd',background:'#f8f9fa'}}>
          <div style={{width:'200px',padding:'12px',fontWeight:600,borderRight:'1px solid #ddd'}}>Task</div>
          <div style={{flex:1,display:'flex'}}>
            {['W3 18-24 JAN','W4 25-31 JAN','W5 01-07 FEB','W6 08-14 FEB','W7 15-21 FEB','W8 22-28 FEB','W9 01-07 MAR'].map((w,i)=><div key={i} style={{flex:1,minWidth:'170px',textAlign:'center',padding:'12px',fontSize:'13px',borderRight:'1px solid #e0e0e0'}}>{w}</div>)}
          </div>
        </div>
        {Object.entries(grouped).map(([ph,pts])=>(
          <div key={ph}>
            <div style={{background:'#f0f0f0',padding:'10px',fontWeight:600,fontSize:'13px'}}>▼ {ph}</div>
            {pts.map(t=>{const p=getPos(t.start_date,t.end_date);const st=getSt(t.status);return(
              <div key={t.id} style={{display:'flex',borderBottom:'1px solid #f0f0f0',minHeight:'50px',alignItems:'center'}}>
                <div style={{width:'200px',padding:'8px',borderRight:'1px solid #e0e0e0'}}>
                  <div style={{fontSize:'12px',fontWeight:600}}>{t.task_code}</div>
                  <div style={{fontSize:'11px',color:'#666'}}>{t.name}</div>
                </div>
                <div style={{flex:1,position:'relative',height:'40px'}}>
                  <div onClick={()=>onClick(t)} style={{position:'absolute',height:'28px',borderRadius:'4px',padding:'0 10px',display:'flex',alignItems:'center',fontSize:'12px',cursor:'pointer',left:p.left,width:p.width,background:st.bg,color:st.c}}>{t.name}</div>
                </div>
              </div>
            );})}
          </div>
        ))}
        <div onClick={onAdd} style={{padding:'12px',cursor:'pointer',borderTop:'1px solid #ddd'}}><span style={{color:'#4285f4',fontWeight:600}}>+ Add Task</span></div>
      </div>
    </div>
  );
}

function KanbanView({tasks,onClick}){
  const sts=[{n:'Open',c:'#d4edda'},{n:'In Progress',c:'#cfe2ff'},{n:'Testing',c:'#fff3cd'},{n:'Done',c:'#d1e7dd'}];
  return(
    <div style={{display:'flex',gap:'16px',overflowX:'auto'}}>
      {sts.map(st=>{const fts=tasks.filter(t=>t.status===st.n);return(
        <div key={st.n} style={{flex:1,minWidth:'280px',background:'white',borderRadius:'8px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'12px',fontWeight:600,borderRadius:'8px 8px 0 0',background:st.c}}>{st.n} ({fts.length})</div>
          <div style={{padding:'12px',minHeight:'400px'}}>
            {fts.map(t=>(
              <div key={t.id} onClick={()=>onClick(t)} style={{background:'white',border:'1px solid #ddd',borderRadius:'8px',padding:'12px',marginBottom:'12px',cursor:'pointer'}}>
                <div style={{fontSize:'12px',fontWeight:600,marginBottom:'4px'}}>{t.task_code}</div>
                <div style={{fontSize:'14px',marginBottom:'8px'}}>{t.name}</div>
                <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>{t.phase_name}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',background:t.avatar_color||'#4285f4',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px'}}>{(t.owner_name||'S').charAt(0)}</div>
                  <span style={{fontSize:'12px'}}>{new Date(t.end_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );})}
    </div>
  );
}

function ListView({tasks,phases,onEdit,onDelete}){
  const grouped=phases.reduce((a,p)=>{a[p.name]=tasks.filter(t=>t.phase_id===p.id);return a;},{});
  const getBd=(s)=>({'Done':{bg:'#d1e7dd',c:'#0f5132'},'In Progress':{bg:'#cfe2ff',c:'#084298'},'Testing':{bg:'#fff3cd',c:'#664d03'},'Open':{bg:'#f0f0f0',c:'#666'}}[s]||{bg:'#f0f0f0',c:'#666'});
  return(
    <div style={{background:'white',borderRadius:'8px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead style={{background:'#f8f9fa',borderBottom:'2px solid #ddd'}}>
          <tr>
            {['ID','Name','Owner','Status','Start','Due','Duration','Actions'].map(h=><th key={h} style={{textAlign:'left',padding:'12px',fontSize:'11px',fontWeight:600,color:'#666'}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([ph,pts])=>(
            <React.Fragment key={ph}>
              <tr style={{background:'#f0f0f0',fontWeight:600}}>
                <td colSpan="8" style={{padding:'12px'}}>▼ {ph}</td>
              </tr>
              {pts.map(t=>{const bd=getBd(t.status);return(
                <tr key={t.id} style={{borderBottom:'1px solid #f0f0f0'}}>
                  <td style={{padding:'12px',fontSize:'13px'}}>{t.task_code}</td>
                  <td style={{padding:'12px',fontSize:'13px'}}>{t.name}</td>
                  <td style={{padding:'12px',fontSize:'13px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{width:'28px',height:'28px',borderRadius:'50%',background:t.avatar_color||'#4285f4',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px'}}>{(t.owner_name||'S').charAt(0)}</div>
                      <span>{t.owner_name}</span>
                    </div>
                  </td>
                  <td style={{padding:'12px'}}><span style={{padding:'4px 12px',borderRadius:'12px',fontSize:'12px',fontWeight:500,background:bd.bg,color:bd.c}}>{t.status}</span></td>
                  <td style={{padding:'12px',fontSize:'13px'}}>{new Date(t.start_date).toLocaleDateString()}</td>
                  <td style={{padding:'12px',fontSize:'13px'}}>{new Date(t.end_date).toLocaleDateString()}</td>
                  <td style={{padding:'12px',fontSize:'13px'}}>{t.duration}d</td>
                  <td style={{padding:'12px'}}>
                    <div style={{display:'flex',gap:'8px'}}>
                      <button onClick={()=>onEdit(t)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px'}}>✏️</button>
                      <button onClick={()=>onDelete(t.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px'}}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );})}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskModal({task,phases,members,projectId,onClose,onSave,onDelete}){
  const [d,setD]=useState({task_code:task?.task_code||'',name:task?.name||'',phase_id:task?.phase_id||(phases[0]?.id||''),status:task?.status||'Open',owner_id:task?.owner_id||(members[0]?.id||''),start_date:task?.start_date||new Date().toISOString().split('T')[0],end_date:task?.end_date||new Date(Date.now()+432000000).toISOString().split('T')[0],duration:task?.duration||5,project_id:task?.project_id||projectId});
  const save=()=>{if(!d.task_code||!d.name){alert('⚠️ Fill required fields!');return;}onSave(d);};
  return(
    <div onClick={(e)=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'white',borderRadius:'8px',width:'90%',maxWidth:'600px',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'20px',borderBottom:'1px solid #ddd',display:'flex',justifyContent:'space-between'}}>
          <h2 style={{margin:0,fontSize:'20px'}}>{task?'Edit Task':'Add Task'}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>&times;</button>
        </div>
        <div style={{padding:'20px'}}>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Task ID *</label><input type="text" value={d.task_code} onChange={(e)=>setD({...d,task_code:e.target.value})} disabled={!!task} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}/></div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Task Name *</label><input type="text" value={d.name} onChange={(e)=>setD({...d,name:e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Phase</label><select value={d.phase_id} onChange={(e)=>setD({...d,phase_id:Number(e.target.value)})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}>{phases.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Status</label><select value={d.status} onChange={(e)=>setD({...d,status:e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}><option>Open</option><option>In Progress</option><option>Testing</option><option>Done</option></select></div>
          </div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Owner</label><select value={d.owner_id} onChange={(e)=>setD({...d,owner_id:Number(e.target.value)})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Start</label><input type="date" value={d.start_date} onChange={(e)=>setD({...d,start_date:e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}/></div>
            <div><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>End</label><input type="date" value={d.end_date} onChange={(e)=>setD({...d,end_date:e.target.value})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}/></div>
          </div>
          <div style={{marginBottom:'16px'}}><label style={{display:'block',marginBottom:'6px',fontSize:'13px',fontWeight:500}}>Duration (days)</label><input type="number" value={d.duration} onChange={(e)=>setD({...d,duration:Number(e.target.value)})} style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',boxSizing:'border-box'}}/></div>
        </div>
        <div style={{padding:'20px',borderTop:'1px solid #ddd',display:'flex',justifyContent:'space-between'}}>
          <div>{task&&onDelete&&<button onClick={onDelete} style={{padding:'8px 16px',border:'none',background:'#dc3545',color:'white',borderRadius:'4px',cursor:'pointer'}}>Delete</button>}</div>
          <div style={{display:'flex',gap:'10px'}}>
            <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #ddd',background:'white',borderRadius:'4px',cursor:'pointer'}}>Cancel</button>
            <button onClick={save} style={{padding:'8px 16px',border:'none',background:'#4285f4',color:'white',borderRadius:'4px',cursor:'pointer'}}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}