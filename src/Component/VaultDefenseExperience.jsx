import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function makeCardTexture() {
  const canvas = document.createElement("canvas");
  const textureScale = 2;
  canvas.width = 1200 * textureScale;
  canvas.height = 760 * textureScale;
  const ctx = canvas.getContext("2d");
  ctx.scale(textureScale, textureScale);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(24, 24, 1152, 712, 34);
  ctx.clip();
  const bg = ctx.createLinearGradient(120, 40, 1070, 720);
  bg.addColorStop(0, "#fffefa");
  bg.addColorStop(0.38, "#f8f7f2");
  bg.addColorStop(0.72, "#eeede7");
  bg.addColorStop(1, "#dcdad3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 760);
  ctx.save();
  ctx.globalAlpha = 0.045;
  for (let y = 0; y < 760; y += 5) {
    ctx.fillStyle = y % 10 === 0 ? "#fff" : "#77736b";
    ctx.fillRect(0, y, 1200, 1);
  }
  ctx.restore();
  const glow = ctx.createLinearGradient(90, 80, 1120, 680);
  glow.addColorStop(0, "rgba(255,255,255,.56)");
  glow.addColorStop(0.45, "rgba(255,255,255,0)");
  glow.addColorStop(1, "rgba(255,255,255,.28)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 760);
  ctx.strokeStyle = "rgba(54,53,48,.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1152, 712);
  ctx.fillStyle = "#77756e";
  ctx.font = "600 25px Arial";
  ctx.letterSpacing = "5px";
  ctx.fillText("PASSVAULT", 78, 91);
  ctx.fillStyle = "#a09e97";
  ctx.font = "500 16px Arial";
  ctx.letterSpacing = "3px";
  ctx.fillText("PERSONAL VAULT", 80, 120);
  const chip = ctx.createLinearGradient(875, 310, 1035, 445);
  chip.addColorStop(0, "#e4d9b8");
  chip.addColorStop(0.45, "#f5eed9");
  chip.addColorStop(1, "#d5c9a8");
  ctx.fillStyle = chip;
  ctx.beginPath();
  ctx.roundRect(875, 310, 150, 128, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(103,91,68,.42)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(925, 312); ctx.lineTo(925, 436);
  ctx.moveTo(975, 312); ctx.lineTo(975, 436);
  ctx.moveTo(877, 352); ctx.lineTo(1023, 352);
  ctx.moveTo(877, 395); ctx.lineTo(1023, 395);
  ctx.stroke();
  ctx.strokeStyle = "rgba(15,23,42,.28)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(1075, 368, 36, -Math.PI * .42, Math.PI * .42);
  ctx.arc(1075, 368, 58, -Math.PI * .39, Math.PI * .39);
  ctx.stroke();
  ctx.fillStyle = "#8b8982";
  ctx.font = "600 18px Arial";
  ctx.letterSpacing = "3px";
  ctx.fillText("ENCRYPTED CREDENTIAL", 80, 390);
  ctx.fillStyle = "#334155";
  ctx.font = "600 27px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  2048", 80, 446);
  ctx.fillStyle = "#8b8982";
  ctx.font = "500 14px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("CARDHOLDER", 80, 525);
  ctx.fillText("VALID THRU", 465, 525);
  ctx.fillStyle = "#55544f";
  ctx.font = "600 21px Arial";
  ctx.letterSpacing = "1px";
  ctx.fillText("ALEX MORGAN", 80, 565);
  ctx.fillText("08 / 29", 465, 565);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(104, 662, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#475569";
  ctx.font = "600 20px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("KEY STORED ON THIS DEVICE", 128, 669);

  // Visa mark and small card-detail touch-up for the payment-card visual.
  ctx.save();
  ctx.translate(1028, 680);
  ctx.rotate(-0.04);
  ctx.fillStyle = "#172554";
  ctx.font = "italic 700 62px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("VISA", 0, 0);
  ctx.restore();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeShield() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.9);
  shape.bezierCurveTo(0.58, 1.58, 1.24, 1.48, 1.68, 1.36);
  shape.lineTo(1.58, 0.25);
  shape.bezierCurveTo(1.5, -0.7, 0.68, -1.55, 0, -1.95);
  shape.bezierCurveTo(-0.68, -1.55, -1.5, -0.7, -1.58, 0.25);
  shape.lineTo(-1.68, 1.36);
  shape.bezierCurveTo(-1.24, 1.48, -0.58, 1.58, 0, 1.9);
  return shape;
}

export default function VaultDefenseExperience({ onOpenAuth }) {
  const hostRef = useRef(null);
  const attackStatusRef = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setSceneReady(false);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "defense-canvas";
    renderer.domElement.setAttribute("aria-label", "3D illustration of an encrypted credential inside a protective shield");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0, 8.2);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.PointLight(0xffffff, 26, 12, 2);
    keyLight.position.set(-3, 3, 4);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xc4b6ff, 14, 10, 2);
    fillLight.position.set(3, -2, 3);
    scene.add(fillLight);

    const group = new THREE.Group();
    group.position.y = 0.08;
    group.scale.set(1.08, 1.08, 1.08);
    scene.add(group);
    const shieldShape = makeShield();
    const shieldGeometry = new THREE.ShapeGeometry(shieldShape, 48);
    const shieldFill = new THREE.Mesh(shieldGeometry, new THREE.MeshBasicMaterial({ color: 0xe7e7e7, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    shieldFill.position.set(0, 0.03, -0.28);
    shieldFill.scale.set(1.05, 1.05, 1);
    group.add(shieldFill);
    const shieldOutline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shieldShape.getPoints(96)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.68 }));
    shieldOutline.position.set(0, 0.03, -0.22);
    shieldOutline.scale.set(1.05, 1.05, 1);
    group.add(shieldOutline);
    const shieldOuter = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shieldShape.getPoints(96)), new THREE.LineBasicMaterial({ color: 0xf8f8f8, transparent: true, opacity: 0.18 }));
    shieldOuter.position.set(0, 0.03, -0.24);
    shieldOuter.scale.set(1.12, 1.12, 1);
    group.add(shieldOuter);
    const shieldInner = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shieldShape.getPoints(96)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34 }));
    shieldInner.position.set(0, 0.03, -0.2);
    shieldInner.scale.set(0.93, 0.93, 1);
    group.add(shieldInner);
    const shieldLight = new THREE.PointLight(0xffffff, 2.5, 5, 2);
    shieldLight.position.set(0, 0, 1.8);
    group.add(shieldLight);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.009, 6, 120), new THREE.MeshBasicMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.24 }));
    halo.scale.set(1.13, 0.69, 1);
    halo.position.set(0, 0.03, -0.58);
    group.add(halo);
    const impactRipple = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    impactRipple.position.set(-1.43, -0.48, -0.08);
    group.add(impactRipple);

    const card = new THREE.Group();
    const cardShape = new THREE.Shape();
    cardShape.moveTo(-1.4, -0.91);
    cardShape.lineTo(1.4, -0.91);
    cardShape.quadraticCurveTo(1.48, -0.91, 1.48, -0.81);
    cardShape.lineTo(1.48, 0.81);
    cardShape.quadraticCurveTo(1.48, 0.91, 1.38, 0.91);
    cardShape.lineTo(-1.38, 0.91);
    cardShape.quadraticCurveTo(-1.48, 0.91, -1.48, 0.81);
    cardShape.lineTo(-1.48, -0.81);
    cardShape.quadraticCurveTo(-1.48, -0.91, -1.4, -0.91);
    const geometry = new THREE.ExtrudeGeometry(cardShape, { depth: 0.12, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.025, bevelThickness: 0.025, steps: 1 });
    geometry.center();
    const body = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.16, roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.18 }));
    card.add(body);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.86, 1.81),
      new THREE.MeshBasicMaterial({
        map: makeCardTexture(),
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      })
    );
    // Keep the printed card details in front of the physical card mesh.
    face.position.z = 0.14;
    face.renderOrder = 2;
    card.add(face);
    card.rotation.set(-0.035, -0.08, -0.018);
    card.position.set(0, 0.12, 0.34);
    card.scale.set(1.04, 1.04, 1.04);
    group.add(card);

    const attack = new THREE.Group();
    const attackGlow = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), new THREE.MeshBasicMaterial({ color: 0xff3b45, transparent: true, opacity: 0.26, depthWrite: false }));
    const attackDot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 16), new THREE.MeshBasicMaterial({ color: 0xff3945 }));
    attack.add(attackGlow);
    attack.add(attackDot);
    const attackLine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xff3945, transparent: true, opacity: 0.45 }));
    attackLine.position.x = -0.29;
    attack.add(attackLine);
    attack.position.set(-2.45, -0.48, -0.1);
    scene.add(attack);

    const savePath = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.42, 0.34, 0.02), new THREE.Vector3(2.08, 0.34, 0.02)]),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })
    );
    scene.add(savePath);
    const vaultNode = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.012, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34 })
    );
    vaultNode.position.set(2.08, 0.34, 0.04);
    scene.add(vaultNode);
    const savePacket = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    savePacket.position.set(1.42, 0.34, 0.08);
    scene.add(savePacket);

    const pointer = { x: 0, y: 0 };
    const easedPointer = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    let cardHovered = false;
    const onPointerMove = (event) => {
      const bounds = host.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      raycaster.setFromCamera({ x: pointer.x, y: -pointer.y }, camera);
      cardHovered = raycaster.intersectObject(face, true).length > 0;
    };
    const onPointerLeave = () => { pointer.x = 0; pointer.y = 0; cardHovered = false; };
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 560 ? 9.8 : 8.2;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    setSceneReady(true);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let animationId;
    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      // Keep the attack / block / save story moving even when reduced motion is on.
      // In that mode only the ambient motion runs more slowly.
      const time = clock.elapsedTime * (reduceMotion ? 0.62 : 1);
      const intro = Math.min(1, time / 1.1);
      const introEase = 1 - (1 - intro) ** 3;
      easedPointer.x += (pointer.x - easedPointer.x) * 0.055;
      easedPointer.y += (pointer.y - easedPointer.y) * 0.055;
      const shieldPulse = 1 + Math.sin(time * 1.6) * 0.025;
      const protectionPulse = 0.48 + Math.sin(time * 1.6) * 0.12;
      group.rotation.z = Math.sin(time * 0.22) * 0.012;
      shieldFill.scale.set(1.05 * shieldPulse, 1.05 * shieldPulse, 1);
      shieldOutline.scale.set(1.05 * shieldPulse, 1.05 * shieldPulse, 1);
      shieldOuter.scale.set(1.12 * shieldPulse, 1.12 * shieldPulse, 1);
      shieldInner.scale.set(0.93 * (1 + Math.sin(time * 1.6 + 1) * 0.035), 0.93 * (1 + Math.sin(time * 1.6 + 1) * 0.035), 1);
      shieldOutline.material.opacity = protectionPulse;
      shieldOuter.material.opacity = 0.12 + Math.sin(time * 1.6 + 0.6) * 0.05;
      shieldInner.material.opacity = 0.2 + Math.sin(time * 1.6 + 1) * 0.12;
      const cycle = (time % 3.6) / 3.6;
      const stage = cycle < 0.62 ? "attack" : cycle < 0.76 ? "blocked" : "saved";
      const status = attackStatusRef.current;
      if (status && status.dataset.state !== stage) {
        status.dataset.state = stage;
        status.lastElementChild.textContent = stage === "attack"
          ? "BOT ATTACK · INCOMING"
          : stage === "blocked" ? "SHIELD · BLOCKED" : "ENCRYPTED · SAVED TO VAULT";
      }
      const approach = Math.min(1, cycle / 0.62);
      const threatProgress = cycle < 0.62 ? approach * approach * (3 - 2 * approach) : 1 - Math.pow((cycle - 0.62) / 0.38, 2) * (3 - 2 * ((cycle - 0.62) / 0.38));
      const impact = Math.max(0, 1 - Math.abs(cycle - 0.62) / 0.055);
      shieldFill.material.opacity = 0.09 + Math.sin(time * 1.6) * 0.025 + impact * 0.13;
      shieldLight.intensity = 1.8 + Math.sin(time * 1.6) * 0.5 + impact * 3;
      const rippleProgress = Math.max(0, Math.min(1, (cycle - 0.62) / 0.24));
      impactRipple.scale.setScalar(0.08 + rippleProgress * 1.7);
      impactRipple.material.opacity = rippleProgress > 0 ? Math.sin(rippleProgress * Math.PI) * 0.68 : 0;
      const saveProgress = Math.max(0, Math.min(1, (cycle - 0.74) / 0.17));
      savePacket.position.x = 1.42 + saveProgress * 0.66;
      savePacket.material.opacity = saveProgress > 0 && saveProgress < 1 ? 0.9 : 0;
      savePath.material.opacity = 0.12 + saveProgress * 0.38;
      vaultNode.material.opacity = saveProgress >= 1 ? 0.8 + Math.sin(time * 5) * 0.15 : 0.28;
      halo.rotation.z = time * 0.08;
      halo.material.opacity = 0.16 + Math.sin(time * 1.6) * 0.08;
      const hoverScale = cardHovered ? 1.075 : 1.04;
      card.scale.set(hoverScale, hoverScale, hoverScale);
      card.position.x = Math.sin(time * 0.32) * 0.025 + (cardHovered ? easedPointer.x * 0.075 : 0);
      card.position.y = -0.12 + introEase * 0.24 + Math.sin(time * 0.48) * 0.025 + (cardHovered ? -0.025 : 0);
      card.position.z = 0.22 + introEase * 0.12 + (cardHovered ? 0.035 : 0);
      card.rotation.x = -0.035 + easedPointer.y * (cardHovered ? 0.075 : 0.025);
      card.rotation.y = -0.08 + Math.sin(time * 0.2) * 0.018 + easedPointer.x * (cardHovered ? 0.09 : 0.03);
      card.rotation.z = -0.018 - easedPointer.x * (cardHovered ? 0.018 : 0.008);
      // The threat advances toward the shield, then is pushed back by its pulse.
      attack.position.x = -2.38 + threatProgress * 0.82;
      attackGlow.material.opacity = 0.2 + threatProgress * 0.18 + impact * 0.35;
      attackDot.scale.setScalar(1 + impact * 0.45);
      attackLine.material.opacity = 0.12 + threatProgress * 0.42;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationId);
      observer.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => { material.map?.dispose(); material.dispose(); });
        else { object.material?.map?.dispose(); object.material?.dispose(); }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <section id="features" className="vault-defense-section">
    <div className="vault-defense-wrap">
      <div className="vault-defense-heading">
        <span className="vault-defense-eyebrow">SECURITY, MADE VISIBLE</span>
        <h2>Your password is sealed before it leaves your device.</h2>
        <p>Even if someone copies the database, your credentials remain encrypted without your master password.</p>
      </div>
      <div className="vault-defense-grid">
        <div className="vault-defense-visual">
          <div className="defense-topline"><span><i /> BROWSER-SIDE ENCRYPTION</span><span>DEVICE &rarr; VAULT</span></div>
          <div className="defense-canvas-host" ref={hostRef}>
            {!sceneReady && <div className="defense-fallback" aria-hidden="true"><div className="fallback-shield"><div className="fallback-card"><span>PASSVAULT</span><b>&bull;&bull;&bull;&bull; &nbsp; &bull;&bull;&bull;&bull; &nbsp; &bull;&bull;&bull;&bull; &nbsp; 2048</b><small>ENCRYPTED CREDENTIAL</small></div></div></div>}
            <span className="defense-label defense-label-top">AES-256-GCM <i /> SEALED</span>
            <span ref={attackStatusRef} className="defense-attack-tag" data-state="attack"><i /><span>BOT ATTACK · INCOMING</span></span>
          </div>
          <div className="defense-legend"><span><i className="legend-encrypted" /> Encrypted credential</span><span><i className="legend-threat" /> Blocked threat path</span><span className="defense-illustrative">Conceptual illustration</span></div>
        </div>
        <div className="vault-defense-copy">
          <div className="defense-copy-kicker">THE IMPORTANT PART</div>
          <h3>Your database never gets the key.</h3>
          <p>PassVault encrypts each saved password in your browser. The database stores an encrypted value; the decryption key is derived from your master password and held in browser memory.</p>
          <div className="defense-flow">
            <div><span>01</span><b>Your device</b><small>Derive key locally</small></div><i aria-hidden="true">&rarr;</i><div><span>02</span><b>Encrypted</b><small>Unreadable payload</small></div><i aria-hidden="true">&rarr;</i><div><span>03</span><b>Your vault</b><small>Store ciphertext</small></div>
          </div>
          <div className="defense-callout"><span>&#8599;</span><p><b>A database copy alone is not your password.</b><br />Your master password is still needed to unlock credentials.</p></div>
          <button className="defense-cta" type="button" onClick={() => onOpenAuth("register")}>Protect my vault <span>&rarr;</span></button>
          <p className="defense-limit">Encryption protects stored data. It cannot protect a device already infected with malware or a vault left unlocked.</p>
        </div>
      </div>
    </div>
  </section>;
}
