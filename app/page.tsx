"use client";

import { useMemo, useState } from "react";

const values = [10, 20, 30, 50, 100, 200];

function PawIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="8" cy="9" r="4"/><circle cx="16" cy="6" r="4"/><circle cx="24" cy="9" r="4"/><circle cx="6" cy="18" r="3.5"/><circle cx="26" cy="18" r="3.5"/><path d="M16 13c-6.2 0-10.5 5-9.2 9.2 1 3.1 4 3.6 6.2 2.6 1.8-.8 4.2-.8 6 0 2.2 1 5.2.5 6.2-2.6C26.5 18 22.2 13 16 13Z"/></svg>;
}

export default function Home() {
  const [amount, setAmount] = useState(30);
  const [custom, setCustom] = useState("");
  const [notice, setNotice] = useState(false);
  const [menu, setMenu] = useState(false);
  const donation = useMemo(() => {
    const parsed = Number(custom.replace(",", "."));
    return custom && Number.isFinite(parsed) && parsed > 0 ? parsed : amount;
  }, [amount, custom]);

  const closeMenu = () => setMenu(false);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" onClick={closeMenu} aria-label="Cãopanhia Baltazar — início">
          <img src="/logo-caopanhia-baltazar.webp" alt="Cãopanhia Baltazar" />
        </a>
        <button className="menu-toggle" aria-label={menu ? "Fechar menu" : "Abrir menu"} aria-expanded={menu} onClick={() => setMenu(!menu)}><span/><span/><span/></button>
        <nav className={menu ? "open" : ""} aria-label="Navegação principal">
          <a href="#historia" onClick={closeMenu}>Nossa história</a>
          <a href="#resgates" onClick={closeMenu}>Resgates reais</a>
          <a href="#como-ajuda" onClick={closeMenu}>Como ajudamos</a>
          <a href="#contato" onClick={closeMenu}>Contato</a>
        </nav>
        <a className="button header-cta" href="#doar">Doar agora</a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-media"><img src="/hero-caopanhia-baltazar.webp" alt="Cão e gato acolhidos pela Cãopanhia Baltazar" /></div>
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="kicker">PROTEÇÃO ANIMAL • RESGATE • CUIDADO</span>
          <h1>Para eles, sua ajuda pode ser a diferença entre o abandono e uma nova vida.</h1>
          <p>A Cãopanhia Baltazar acolhe animais vulneráveis e transforma doações em alimento, atendimento e cuidado real.</p>
          <div className="hero-actions"><a className="button button-large" href="#doar">Quero salvar uma vida</a><a className="secondary-link" href="#resgates">Veja por quem lutamos</a></div>
          <div className="hero-proof"><span><b>100%</b> dedicado à causa</span><span><b>Pix</b> rápido e seguro</span><span><b>Qualquer valor</b> já ajuda</span></div>
        </div>
      </section>

      <section className="urgency-strip"><p><strong>Hoje, há animais esperando por cuidado.</strong> Sua doação ajuda a manter resgates, alimentação e tratamentos.</p><a href="#doar">Contribuir agora</a></section>

      <section className="donation-section" id="doar">
        <div className="donation-intro">
          <span className="section-label">DOAÇÃO VIA PIX</span>
          <h2>Escolha quanto amor você quer transformar em cuidado.</h2>
          <p>Selecione um valor rápido ou informe outra quantia. Na etapa seguinte, o QR Code Pix será gerado com segurança.</p>
          <ul><li>Ajuda na compra de ração</li><li>Apoia consultas e medicamentos</li><li>Mantém resgates e acolhimentos</li></ul>
        </div>
        <div className="donation-card">
          <div className="card-title"><span>Escolha o valor</span><small>Doação única</small></div>
          <div className="value-grid">{values.map(value => <button key={value} className={amount === value && !custom ? "active" : ""} onClick={() => { setAmount(value); setCustom(""); }}>R$ {value}</button>)}</div>
          <label htmlFor="custom">Outro valor</label>
          <div className="money-input"><span>R$</span><input id="custom" inputMode="decimal" placeholder="0,00" value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9,.]/g, ""))} /></div>
          <button className="button payment-button" onClick={() => setNotice(true)}>Doar R$ {donation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} via Pix</button>
          <p className="secure-note">Pagamento protegido. Seus dados não ficam armazenados neste site.</p>
          {notice && <div className="gateway-notice" role="status"><button className="close" aria-label="Fechar" onClick={() => setNotice(false)}>×</button><strong>Pagamento pronto para integração</strong><p>Precisamos conectar a gateway escolhida para gerar o QR Code Pix real.</p><a href="https://wa.me/5521968053672?text=Ol%C3%A1%2C%20quero%20fazer%20uma%20doa%C3%A7%C3%A3o%20para%20a%20C%C3%A3opanhia%20Baltazar" target="_blank" rel="noreferrer">Enquanto isso, fale conosco</a></div>}
        </div>
      </section>

      <section className="story-section" id="historia">
        <div className="story-image"><img src="/cuidados-voluntarios.webp" alt="Voluntária cuidando de uma cadela resgatada" /><span>Cuidado próximo, paciente e humano.</span></div>
        <div className="story-copy"><span className="section-label">NOSSA HISTÓRIA</span><h2>O resgate não termina quando o animal sai da rua.</h2><p>É ali que uma nova caminhada começa. Cada animal acolhido precisa recuperar a segurança, receber alimentação, cuidados de higiene e, quando necessário, acompanhamento veterinário.</p><p>A Cãopanhia Baltazar existe para transformar vulnerabilidade em proteção. Fazemos isso com trabalho diário, mãos voluntárias e pessoas que escolhem não ignorar o sofrimento animal.</p><blockquote>Doar é participar diretamente dessa transformação.</blockquote></div>
      </section>

      <section className="rescue-section" id="resgates">
        <div className="section-heading"><span className="section-label">HISTÓRIAS QUE PEDEM AÇÃO</span><h2>As imagens mostram por que essa causa não pode esperar.</h2><p>Não atribuímos diagnósticos sem avaliação veterinária. Mostramos o que pode ser observado e o cuidado que situações assim exigem.</p></div>
        <div className="rescue-grid">
          <article className="rescue-card"><img src="/resgate-filhote-caixa.webp" alt="Filhote acolhido dentro de uma caixa com uma manta" /><div className="rescue-content"><span>ACOLHIMENTO</span><h3>Um filhote procurando segurança</h3><p>Na foto, um filhote está acomodado em uma caixa com uma manta. Animais tão jovens dependem de abrigo, alimentação adequada, proteção térmica e acompanhamento responsável.</p><a href="#doar">Ajude nos primeiros cuidados</a></div></article>
          <article className="rescue-card"><img src="/mae-com-filhotes.webp" alt="Cadela amamentando vários filhotes enquanto recebe carinho" /><div className="rescue-content"><span>MATERNIDADE</span><h3>Uma mãe e muitas vidas dependentes</h3><p>A cadela aparece amamentando vários filhotes enquanto recebe cuidado humano. Nessa fase, alimento, água, ambiente protegido e acompanhamento são essenciais para toda a família.</p><a href="#doar">Apoie mães e filhotes</a></div></article>
          <article className="rescue-card rescue-wide"><img src="/resgate-vulnerabilidade.webp" alt="Cachorro muito magro sendo amparado durante um resgate" /><div className="rescue-content"><span>RESGATE URGENTE</span><h3>Quando a vulnerabilidade está diante dos nossos olhos</h3><p>O cão aparece muito magro, com falhas visíveis na pelagem e sendo amparado em um ambiente precário. A imagem reforça a urgência de retirar o animal do risco e buscar avaliação profissional, alimento e recuperação protegida.</p><a href="#doar">Faça parte da recuperação</a></div></article>
        </div>
      </section>

      <section className="impact-section" id="como-ajuda">
        <div className="impact-copy"><span className="section-label light-label">SUA DOAÇÃO EM MOVIMENTO</span><h2>O que parece pouco para você pode ser essencial para um resgate.</h2><p>Cada contribuição se soma a outras e mantém uma rede de cuidado funcionando.</p></div>
        <div className="impact-grid"><div><span>01</span><h3>Alimentação</h3><p>Ração e suporte alimentar para animais vulneráveis.</p></div><div><span>02</span><h3>Saúde</h3><p>Consultas, exames, medicamentos e vacinação.</p></div><div><span>03</span><h3>Acolhimento</h3><p>Transporte, higiene, abrigo e recuperação segura.</p></div></div>
      </section>

      <section className="final-cta" id="contato"><div className="paw-seal"><PawIcon /></div><span className="section-label">NÃO PASSE ADIANTE</span><h2>Se essas histórias tocaram você, transforme esse sentimento em ajuda.</h2><p>Doe agora ou fale com a Cãopanhia Baltazar pelo WhatsApp.</p><div><a className="button button-large" href="#doar">Fazer uma doação</a><a className="whatsapp-button" href="https://wa.me/5521968053672?text=Ol%C3%A1%2C%20quero%20ajudar%20a%20C%C3%A3opanhia%20Baltazar" target="_blank" rel="noreferrer">WhatsApp: (21) 96805-3672</a></div></section>

      <footer><a className="brand footer-brand" href="#inicio"><img src="/logo-caopanhia-baltazar.webp" alt="Cãopanhia Baltazar" /></a><p>Resgate, proteção e cuidado animal.</p><p>© 2026 Cãopanhia Baltazar</p></footer>
      <a className="mobile-donate" href="#doar">Doar agora</a>
    </main>
  );
}
