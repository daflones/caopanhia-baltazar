"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

const values = [5, 10, 20, 50, 100, 200];
const MANUAL_PIX_KEY = "9193672363";

function PawIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="8" cy="9" r="4"/><circle cx="16" cy="6" r="4"/><circle cx="24" cy="9" r="4"/><circle cx="6" cy="18" r="3.5"/><circle cx="26" cy="18" r="3.5"/><path d="M16 13c-6.2 0-10.5 5-9.2 9.2 1 3.1 4 3.6 6.2 2.6 1.8-.8 4.2-.8 6 0 2.2 1 5.2.5 6.2-2.6C26.5 18 22.2 13 16 13Z"/></svg>;
}

export default function Home() {
  const [amount, setAmount] = useState(30);
  const [custom, setCustom] = useState("");
  const [notice, setNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const donation = useMemo(() => {
    const parsed = Number(custom.replace(",", "."));
    return custom && Number.isFinite(parsed) && parsed > 0 ? parsed : amount;
  }, [amount, custom]);

  const closeMenu = () => setMenu(false);
  const isManualPix = donation > 0 && donation < 5;

  // Polling for payment status
  useEffect(() => {
    if (paymentData && paymentData.payment_method === "mercosulpay_pix" && paymentStatus !== "completed" && paymentStatus !== "failed" && paymentStatus !== "expired") {
      pollingRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/donations/${paymentData.reference_id}/status`);
          if (response.ok) {
            const data = await response.json();
            setPaymentStatus(data.status);
            if (data.status === "completed" || data.status === "failed" || data.status === "expired") {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 4000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [paymentData, paymentStatus]);

  async function copyPixKey() {
    await navigator.clipboard.writeText(MANUAL_PIX_KEY);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function handleDonate() {
    setLoading(true);
    setError(null);
    setPaymentData(null);
    setPaymentStatus(null);

    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: donation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro ao processar doação" }));
        throw new Error(errorData.error || "Erro ao processar doação");
      }

      const data = await response.json();
      setPaymentData(data);
      setPaymentStatus(data.status);
      setNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar doação");
    } finally {
      setLoading(false);
    }
  }

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
          <p>Para doações a partir de R$ 5, o QR Code Pix será gerado automaticamente. Para valores menores, mostramos nossa chave Pix direta.</p>
          <ul><li>Ajuda na compra de ração</li><li>Apoia consultas e medicamentos</li><li>Mantém resgates e acolhimentos</li></ul>
        </div>
        <div className="donation-card">
          <div className="card-title"><span>Escolha o valor</span><small>Doação única</small></div>
          <div className="value-grid">{values.map(value => <button key={value} className={amount === value && !custom ? "active" : ""} onClick={() => { setAmount(value); setCustom(""); }}>R$ {value}</button>)}</div>
          <label htmlFor="custom">Outro valor</label>
          <div className="money-input"><span>R$</span><input id="custom" inputMode="decimal" placeholder="0,00" value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9,.]/g, ""))} /></div>
          <button className="button payment-button" disabled={donation <= 0 || loading} onClick={handleDonate}>
            {loading ? "Processando..." : isManualPix ? "Ver chave Pix para doar" : `Doar R$ ${donation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} via Pix`}
          </button>
          <p className="secure-note">Pagamento protegido. Seus dados não ficam armazenados neste site.</p>
          {error && <div className="error-message" role="alert">{error}</div>}
          {notice && paymentData && paymentData.payment_method === "manual_pix" && (
            <div className="gateway-notice manual-pix-notice" role="dialog" aria-modal="true" aria-label="Doação por chave Pix">
              <button className="close" aria-label="Fechar" onClick={() => setNotice(false)}>×</button>
              <span className="manual-tag">DOAÇÃO DIRETA</span>
              <strong>Muito obrigado por escolher ajudar!</strong>
              <p>Para doar <b>R$ {paymentData.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>, envie o Pix diretamente para nossa chave de telefone:</p>
              <div className="pix-key-box"><small>Chave Pix</small><b>{paymentData.pix_key}</b></div>
              <button className="copy-pix-button" onClick={copyPixKey}>{copied ? "Chave Pix copiada" : "Copiar chave Pix"}</button>
              <p className="manual-thanks">Mesmo uma pequena contribuição ajuda a levar alimento, cuidado e proteção para quem precisa.</p>
            </div>
          )}
          {notice && paymentData && paymentData.payment_method === "mercosulpay_pix" && paymentStatus !== "completed" && (
            <div className="gateway-notice" role="status">
              <button className="close" aria-label="Fechar" onClick={() => { setNotice(false); if (pollingRef.current) clearInterval(pollingRef.current); }}>×</button>
              <strong>Pagamento automático via Pix</strong>
              <p>Aguardando pagamento de <b>R$ {paymentData.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></p>
              {paymentData.qr_code && (
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <QRCodeCanvas 
                    value={paymentData.qr_code} 
                    size={200}
                    level="M"
                    includeMargin={true}
                    style={{ borderRadius: '8px' }}
                  />
                </div>
              )}
              {paymentData.qr_code && (
                <div className="pix-copy-paste">
                  <small>Pix Copia e Cola:</small>
                  <code>{paymentData.qr_code}</code>
                  <button className="copy-button" onClick={() => { navigator.clipboard.writeText(paymentData.qr_code); }}>Copiar código Pix</button>
                </div>
              )}
              <p className="status-indicator">Status: {paymentStatus === "pending" ? "Aguardando pagamento..." : paymentStatus}</p>
            </div>
          )}
          {notice && paymentData && paymentData.payment_method === "mercosulpay_pix" && paymentStatus === "completed" && (
            <div className="gateway-notice success-notice" role="status">
              <button className="close" aria-label="Fechar" onClick={() => setNotice(false)}>×</button>
              <strong>Doação confirmada!</strong>
              <p>Muito obrigado por fazer parte dessa corrente de cuidado. Sua contribuição ajuda a Cãopanhia Baltazar a oferecer alimento, proteção, atendimento e uma nova chance aos animais que precisam. Cada doação importa. Cada gesto salva vidas.</p>
            </div>
          )}
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

      <section className="final-cta" id="contato"><div className="paw-seal"><PawIcon /></div><span className="section-label">NÃO PASSE ADIANTE</span><h2>Se essas histórias tocaram você, transforme esse sentimento em ajuda.</h2><p>Doe agora ou fale com a Cãopanhia Baltazar pelo WhatsApp.</p><div><a className="button button-large" href="#doar">Fazer uma doação</a><a className="whatsapp-button" href="https://wa.me/559193672363?text=Ol%C3%A1%2C%20quero%20ajudar%20a%20C%C3%A3opanhia%20Baltazar" target="_blank" rel="noreferrer">WhatsApp: (21) 96805-3672</a></div></section>

      <footer><a className="brand footer-brand" href="#inicio"><img src="/logo-caopanhia-baltazar.webp" alt="Cãopanhia Baltazar" /></a><p>Resgate, proteção e cuidado animal.</p><p>© 2026 Cãopanhia Baltazar</p></footer>
      <a className="mobile-donate" href="#doar">Doar agora</a>
    </main>
  );
}
