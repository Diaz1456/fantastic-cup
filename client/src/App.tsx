export default function App() {
  return (
    <div className="app" style={{
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',background:'#080c1a',color:'#c8d6e5',fontFamily:"'Courier New',monospace",gap:24,padding:20
    }}>
      <h1 style={{color:'#88a0c0',letterSpacing:3,textTransform:'uppercase',fontSize:'1.1rem'}}>
        📈 Event Center
      </h1>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center'}}>
        <a href="/event/team-stock.html" style={{
          background:'#0f1838',border:'1px solid #1a2755',color:'#88a0c0',
          padding:'10px 24px',borderRadius:6,textDecoration:'none',textTransform:'uppercase',
          letterSpacing:2,fontSize:'12px',transition:'0.2s'
        }} onMouseOver={e => e.target.style.borderColor='#88a0c0'}
           onMouseOut={e => e.target.style.borderColor='#1a2755'}>
          📊 Team Stock Market
        </a>
        <a href="/" style={{
          background:'#0f1838',border:'1px solid #1a2755',color:'#6e8bb8',
          padding:'10px 24px',borderRadius:6,textDecoration:'none',textTransform:'uppercase',
          letterSpacing:2,fontSize:'12px',transition:'0.2s'
        }} onMouseOver={e => e.target.style.borderColor='#6e8bb8'}
           onMouseOut={e => e.target.style.borderColor='#1a2755'}>
          🏠 Main Menu
        </a>
      </div>
    </div>
  );
}
