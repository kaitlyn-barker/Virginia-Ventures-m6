// ============================================================================
// Virginia Today: Industry Explorer  (Virginia Ventures, Module 6)
// The 5th-grade WebXR tour of modern Virginia's economy, hosted by Foreman Fox.
// A hub-and-spoke experience: the student stands at a Virginia map and picks
// four stops in any order, then reads an Explorer Report of how they did.
// This file sets up, top to bottom:
//   1. The CONSTANTS blocks: HUB, STOPS, ONBOARD, per-stop staging/scene tuning,
//      the PORT mini-game config, and the REPORT copy (all tunable in one place)
//   2. The IWSDK world and the standing spawn (no artificial locomotion)
//   3. The opening onboarding: goal card, Fox control tutorial, and the map gate
//   4. The hub: Fox plus four landmark pedestals, point-to-travel, gold stamps,
//      and the running hub-meters panel (Economic Impact / Innovation / Problem)
//   5. The shared decision runner used by three stops (Tech, Tourism, Farm),
//      each stop supplied as data (Fox line, decisions, staging, backdrop)
//   6. The Port of Virginia mini-game: the one custom mechanic (load containers
//      onto the matching ship), with its own scoring, directions, and finish flow
//   7. The Explorer Report: four stamps, staged meter reveal with stars, a
//      Virginia title, and a printable teacher page
// The 3D primitive/card helpers and the base world live in src/environment.ts;
// the fileless WebAudio cues live in src/sfx.ts.
// ============================================================================

import {
  World,
  SessionMode,
  LocomotionEnvironment,
  EnvironmentType,
  VisibilityState,
  Hovered,
  Pressed,
  PanelUI,
  PanelDocument,
  Interactable,
  Vector3,
  Box3,
  Group,
  Color,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  RepeatWrapping,
  DoubleSide,
  SlideSystem,
  TurnSystem,
} from "@iwsdk/core";

import { buildBaseWorld } from "./environment";
import { meshBox, meshCyl, meshSphere, meshCone, makeTitleCard, makeSpeechBubble, makeTextPanel, makeButtonCard, makeChoiceCard, makeInfoCard, makeReadoutCard, makeExplorerReportCard, makeGoalCard, makeHighlightFrame, makeThenNowCard } from "./environment";
import { sfxStage, sfxClick, sfxFanfare, sfxChime, sfxShipHorn, startHum, stopHum, startVillageAmbience, stopVillageAmbience, startFarmAmbience, stopFarmAmbience, startPortAmbience, stopPortAmbience } from "./sfx";

// Tunable data + copy (HUB, STOPS, DECISION_PACKS, per-stop staging, PORT,
// REPORT) lives in src/stops-data.ts so a stop can be added or tuned as data.
import {
  HUB, LANDMARK, HUB_COLOR, STOPS, ONBOARD, ONBOARD_LINES,
  DECISION_PACKS, STAGING, TECH_BUILD, TECH_ROOM, TOURISM_BUILD, TOURISM_VILLAGE,
  FARM_BUILD, FARM_VALLEY, PORT, REPORT, THEN_NOW,
  type MeterEffects, type StageReaction, type DecisionOption, type Decision, type DecisionPack,
} from "./stops-data";

// ============================================================================
// THE WORLD
// ============================================================================
World.create(document.getElementById("scene-container") as HTMLDivElement, {
  assets: {},
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    features: { handTracking: { required: false }, layers: { required: false } },
  },
  features: {
    // NO ARTIFICIAL LOCOMOTION (VR comfort, non-negotiable, these are kids). The
    // experience is built for a student who STANDS at the fixed spawn and points,
    // so browserControls is off (no desktop first-person keys) and the actual
    // thumbstick slide + snap turn are zeroed just after the world is ready, in the
    // "lock down locomotion" loop below. The feature config here does not expose
    // slidingSpeed/turningAngle, so that has to happen on the SlideSystem/TurnSystem
    // themselves. The desktop preview still steers with mouse-look (browserLookLoop)
    // and the wider desktop fov (desktopFovLoop) frames every interactable, so no
    // walking is needed either.
    //
    // The locomotion feature stays ON for the two things it still owns:
    // initialPlayerPosition spawns the player RIG at the entrance side (z +7), so
    // the collision capsule lines up with the camera (local z 0) and the hedge
    // boundary stops in the right place; and useWorker is OFF so that spawn applies
    // immediately on the main thread instead of snapping forward from the origin.
    locomotion: {
      useWorker: false,
      browserControls: false,
      initialPlayerPosition: [0, 0, 7],
    },
    grabbing: true,
    physics: true,
    sceneUnderstanding: false,
    environmentRaycast: false,
  },
}).then(function (world) {
  const scene = world.scene;
  const camera = world.camera;

  // Eye height only — no z offset. The player rig is spawned back on the
  // entrance side via locomotion's initialPlayerPosition, so keeping the camera
  // at local z 0 means the collision capsule sits exactly under the viewer
  // (otherwise walls would block you metres away from where they look).
  camera.position.set(0, 1.6, 0);

  // --------------------------------------------------------------------------
  // BROWSER MOUSE LOOK (right button looks; left button stays for clicks).
  // In the headset the headset owns the view, so this only runs in the browser.
  // --------------------------------------------------------------------------
  const lookContainer = document.getElementById("scene-container") as HTMLDivElement;
  const LOOK_BUTTON = 2; // right mouse button
  let lookDragging = false;
  let lookHasLooked = false;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  const LOOK_SENSITIVITY = 0.0025;
  const LOOK_PITCH_LIMIT = 1.4;

  lookContainer.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  lookContainer.addEventListener("pointerdown", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = true;
    lookHasLooked = true;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookContainer.style.cursor = "grabbing";
  });
  window.addEventListener("pointermove", function (e) {
    if (!lookDragging) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookYaw = lookYaw - dx * LOOK_SENSITIVITY;
    lookPitch = lookPitch - dy * LOOK_SENSITIVITY;
    lookPitch = Math.max(-LOOK_PITCH_LIMIT, Math.min(LOOK_PITCH_LIMIT, lookPitch));
  });
  window.addEventListener("pointerup", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = false;
    lookContainer.style.cursor = "";
  });

  function browserLookLoop() {
    if (lookHasLooked) {
      if (world.visibilityState.peek() === VisibilityState.NonImmersive) {
        camera.rotation.set(lookPitch, lookYaw, 0, "YXZ");
      }
    }
  }
  // setInterval, never requestAnimationFrame (the project's headset rule, since rAF
  // pauses in the headset). This loop only steers the desktop PREVIEW camera and is a
  // no-op in the headset, so a 33ms tick is more than enough.
  setInterval(browserLookLoop, 33);

  // --------------------------------------------------------------------------
  // DESKTOP-ONLY WIDE VIEW
  // On a laptop the whole scene is rendered through one flat window, so anything
  // outside a narrow forward cone needs a camera drag to reach. The engine builds
  // the camera at a 50 degree vertical field of view; at that fov the play areas
  // (the hub row, the runner's side button, the close conveyor) spill past the
  // screen edges. Widening the PREVIEW camera's fov a little pulls every screen's
  // buttons and panels into the default forward view at once, with no dragging.
  //
  // This is DESKTOP ONLY. In the headset the XR system supplies its own per-eye
  // projection and owns the view, and the engine snapshots + restores the camera
  // around each XR session, so a wider desktop fov never reaches the headset. To be
  // certain the headset is untouched we also hand the camera back its ORIGINAL fov
  // whenever the experience is immersive (that also keeps presentPanel's in-headset
  // sizing identical to before). The fov is only re-applied when it actually changes,
  // and this is setInterval, not requestAnimationFrame (rAF pauses in a headset).
  const ORIGINAL_FOV = (camera as any).fov;            // the engine default (50); the headset keeps this
  const DESKTOP_FOV = Math.max(ORIGINAL_FOV, 70);      // a modestly wider laptop overview (never narrower)
  function desktopFovLoop() {
    const cam = camera as any;
    if (typeof cam.fov !== "number" || typeof cam.updateProjectionMatrix !== "function") return;
    const desktopView = world.visibilityState.peek() === VisibilityState.NonImmersive;
    const want = desktopView ? DESKTOP_FOV : ORIGINAL_FOV;
    if (cam.fov !== want) {
      cam.fov = want;
      cam.updateProjectionMatrix();
    }
  }
  setInterval(desktopFovLoop, 33);
  desktopFovLoop(); // frame the very first desktop frame wide, before the first tick

  // --------------------------------------------------------------------------
  // LOCK DOWN LOCOMOTION  —  enforce the no-artificial-movement comfort rule.
  // The locomotion feature is kept for the spawn + hedge boundary (see the World
  // config above), but the World-level config does not expose the slide speed or
  // the turn angle, so we zero them on the SlideSystem and TurnSystem directly.
  // Those two systems are registered ASYNC (the Locomotor initializes off the
  // main path), and their reactive config only forwards FUTURE changes, so we
  // poll until both exist, set maxSpeed and turningAngle to 0, then stop. After
  // this the thumbstick cannot slide the student and cannot snap-turn the view,
  // so a stray nudge can never move a kid or spin them away from the scene.
  const lockLocomotion = setInterval(function () {
    const slide = world.getSystem(SlideSystem);
    const turn = world.getSystem(TurnSystem);
    if (slide) slide.config.maxSpeed.value = 0;       // no thumbstick / WASD slide
    if (turn) turn.config.turningAngle.value = 0;      // snap turn rotates nothing
    if (slide && turn) clearInterval(lockLocomotion);
  }, 50);

  // --------------------------------------------------------------------------
  // HIDDEN-PANEL CLICK GUARD
  // IWSDK keeps every panel alive and just toggles visibility. Pointer ray tests
  // do NOT skip invisible meshes, so a hidden button can sit in front of a real
  // one and silently swallow the click. Each tick we mark effectively-hidden ray
  // targets pointerEvents = "none" so they are skipped, and restore them when
  // shown. setInterval (not requestAnimationFrame) because rAF pauses in a headset.
  // --------------------------------------------------------------------------
  function hitTestVisibilityLoop() {
    const targets = (scene as any).rayDescendants as any[] | undefined;
    if (!targets) return;
    for (const obj of targets) {
      let visible = obj.visible;
      let p = obj.parent;
      while (visible) {
        if (!p) break;
        visible = p.visible;
        p = p.parent;
      }
      if (!visible) {
        if (!obj.__guardHidden) {
          obj.__savedPointerEvents = obj.pointerEvents;
          obj.__guardHidden = true;
        }
        obj.pointerEvents = "none";
      } else if (obj.__guardHidden) {
        obj.pointerEvents = obj.__savedPointerEvents;
        obj.__guardHidden = false;
      }
    }
  }
  setInterval(hitTestVisibilityLoop, 33);

  // --------------------------------------------------------------------------
  // PANEL PRESENTATION
  // A panel is anchored in the world, near Fox or a building. But the
  // player almost always walks RIGHT UP to that anchor, ending up far too close
  // to read the panel, so the cards and buttons at the bottom fall off the screen.
  // presentPanel snaps a panel to a comfortable distance directly in front of
  // the player, sized from the panel's real bounds and the live camera so the
  // WHOLE panel fits in view, then turns it to face the player. It is called
  // once each time a panel first appears (showPanel), so a panel you are reading
  // or clicking stays put. Works the same on desktop and in a headset.
  // --------------------------------------------------------------------------
  const _presEye = new Vector3();
  const _presFwd = new Vector3();
  const _presSize = new Vector3();
  const _presBox = new Box3();
  const PRESENT_MARGIN = 1.18;  // breathing room so the panel is not edge-to-edge
  const PRESENT_MARGIN_DESKTOP = 1.4; // a bit more on a laptop, so the corner overlay does not crowd panels
  const PRESENT_MIN_DIST = 2.4; // never closer than this, however small the panel
  const PRESENT_MAX_DIST = 6.0; // never farther than this, however large the panel

  function presentPanel(entity: any) {
    const cam: any = world.camera;
    const o3d = entity.object3D;
    if (!cam || !o3d) return;

    // Measure the panel's real size. For a flat panel turned only on its Y axis,
    // the width lives in the X/Z plane and the height is always Y, so this stays
    // correct no matter which way the panel is currently facing.
    _presBox.setFromObject(o3d);
    _presBox.getSize(_presSize);
    const w = Math.hypot(_presSize.x, _presSize.z) || 2.6;
    const h = _presSize.y > 0.01 ? _presSize.y : 2.2;

    // Distance that fits the height (vertical FOV) and the width (FOV * aspect).
    const tanV = Math.tan((cam.fov * Math.PI) / 360); // tan(halfFov)
    const aspect = cam.aspect || 1;
    const distH = h / 2 / tanV;
    const distW = w / 2 / (tanV * aspect);
    // On a laptop the corner overlay sits in front of panels, so give them more
    // room there. In the headset there is no overlay, so keep them big.
    const desktopView = world.visibilityState.peek() === VisibilityState.NonImmersive;
    const margin = desktopView ? PRESENT_MARGIN_DESKTOP : PRESENT_MARGIN;
    let dist = Math.max(distH, distW) * margin;
    dist = Math.max(PRESENT_MIN_DIST, Math.min(PRESENT_MAX_DIST, dist));

    // Place it straight ahead of the camera, level, at the player's eye height.
    cam.getWorldPosition(_presEye);
    cam.getWorldDirection(_presFwd);
    _presFwd.y = 0;
    if (_presFwd.lengthSq() < 1e-6) _presFwd.set(0, 0, -1);
    _presFwd.normalize();
    const px = _presEye.x + _presFwd.x * dist;
    const pz = _presEye.z + _presFwd.z * dist;
    o3d.position.set(px, _presEye.y, pz);
    // Turn to face the player (a panel's front is its +Z side).
    o3d.rotation.set(0, Math.atan2(_presEye.x - px, _presEye.z - pz), 0, "YXZ");
    applyPanelOnTop(entity);
  }

  // Draw a panel OVER the 3D world so Fox or a building can never sit
  // in front of it and hide the cards. The player walks right up to these spots,
  // so a readable (far enough) panel often lands at or behind the thing it
  // belongs to; turning off depth testing and lifting the render order keeps the
  // whole panel visible while preserving UIKit's own internal layering.
  function applyPanelOnTop(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    o3d.traverse(function (child: any) {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        m.depthTest = false;
        m.depthWrite = false;
      }
      // Lift above the scene (renderOrder 0) once, keeping relative UIKit order.
      if (!child.__onTop) {
        child.renderOrder = (child.renderOrder || 0) + 2000;
        child.__onTop = true;
      }
    });
  }

  // Make a panel visible, snapping it in front of the player the first time it
  // appears. Idempotent while already shown, so reading/clicking it is stable.
  // The on-top maintenance loop (below) keeps it drawing over the world, even as
  // UIKit builds later content (a reply, a result) into the panel.
  function showPanel(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    if (!o3d.visible) presentPanel(entity);
    o3d.visible = true;
  }

  // Every story panel, watched by one loop that re-applies applyPanelOnTop to
  // whichever is visible. UIKit creates text/glyph meshes lazily and only after
  // a panel's content is set, so a one-time pass misses them. A panel placed
  // behind Fox or a building would then show its boxes but hide its words. This
  // keeps the WHOLE visible panel on top, frame after frame.
  const storyPanels: any[] = [];
  setInterval(function () {
    for (const p of storyPanels) {
      if (p.object3D && p.object3D.visible) applyPanelOnTop(p);
    }
  }, 33);

  // --------------------------------------------------------------------------
  // The walkable world (sky, light, ground). See src/environment.ts.
  // --------------------------------------------------------------------------
  const built = buildBaseWorld(world);
  const ground = built.ground;
  ground.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  // The hedge ring is collision too: the locomotion engine bakes its meshes into
  // the walkable BVH, so the player's capsule bumps into it and can no longer
  // walk off the edge of the world and fall.
  built.boundary.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

  ground.object3D!.visible = false;
  built.boundary.object3D!.visible = false;

  // ======================================================================
  // MODULE 6 HUB  —  a clean lineup of four stations the student picks from.
  // The host (Foreman Fox) stands at the left end, each landmark sits on its
  // own pedestal in one evenly spaced row, each wears a floating title, and a
  // gold check marks the ones already finished. No pointing, travel, or meters
  // yet. Everything reads its numbers from the HUB + STOPS constants and the
  // shared mesh helpers in environment.ts.
  // ======================================================================
  // The big Module 8 checker floor is gone; a compact stage (below) is the only
  // floor now, so the lineup reads as a tight composition over open sky.
  ground.object3D!.visible = false;

  const hubGroup = new Group();
  scene.add(hubGroup);

  // Where the row sits, derived once so the stage and Fox line up with it. The
  // WHOLE lineup is centered on ROW_CENTER_X: Fox takes the left "slot" and the
  // four stations follow, so looking straight ahead the student sees all of it
  // at once. Fox = -2 spacings, Tech = -1, Port = 0, Tourism = +1, Farm = +2.
  const firstX = HUB.ROW_CENTER_X - HUB.SPACING;       // Tech, the left station
  const lastX = HUB.ROW_CENTER_X + 2 * HUB.SPACING;    // Farm, the right station
  const foxX = firstX - HUB.FOX_GAP;                    // Fox just left of the row

  // --- The stage: one compact platform under Fox and the four pedestals. It
  // replaces both the old map table and the big checker floor. Just wide enough
  // for Fox plus the row, and deep enough that the student stands on it too. ---
  const stageLeft = foxX - HUB.STAGE_MARGIN;
  const stageRight = lastX + HUB.STAGE_MARGIN;
  const stageW = stageRight - stageLeft;
  const stageCx = (stageLeft + stageRight) / 2;
  const stageD = HUB.STAGE_BACK_Z - HUB.STAGE_FRONT_Z;
  const stageCz = (HUB.STAGE_FRONT_Z + HUB.STAGE_BACK_Z) / 2;

  // A slightly larger, darker slab beneath gives the stage a finished edge.
  const stageRim = meshBox(stageW + 0.22, HUB.STAGE_THICK * 0.7, stageD + 0.22, HUB_COLOR.stageRim);
  stageRim.position.set(stageCx, HUB.STAGE_TOP_Y - HUB.STAGE_THICK, stageCz);
  hubGroup.add(stageRim);
  const stage = meshBox(stageW, HUB.STAGE_THICK, stageD, HUB_COLOR.stage);
  stage.position.set(stageCx, HUB.STAGE_TOP_Y - HUB.STAGE_THICK / 2, stageCz);
  hubGroup.add(stage);

  // --- The ground: a calm, warm-neutral surface just under the stage so nothing
  // floats over open sky. Sized to the scene (a little past the stage on every
  // side), NOT the old large checker floor. The sky overhead is untouched. ---
  const groundW = stageW + HUB.GROUND_PAD_W;
  const groundD = stageD + HUB.GROUND_PAD_D;
  const groundTopY = HUB.STAGE_TOP_Y - HUB.STAGE_THICK - 0.05; // just below the stage rim
  const groundSlab = meshBox(groundW, HUB.GROUND_THICK, groundD, HUB_COLOR.ground);
  groundSlab.position.set(stageCx, groundTopY - HUB.GROUND_THICK / 2, stageCz);
  hubGroup.add(groundSlab);

  // --- The host: a friendly low-poly Foreman Fox at the LEFT end of the row,
  // facing the student. A primitive stand-in until the real model lands. ---
  function buildHubFox(): Group {
    const fox = new Group();
    const ORANGE = "#e07a30";
    const CREAM = "#f6ead3";
    const DARK = "#3a2a1c";
    const HAT = "#f4c20d";

    const torso = meshBox(0.34, 0.46, 0.22, ORANGE); torso.position.y = 0.72; fox.add(torso);
    const belly = meshBox(0.2, 0.34, 0.06, CREAM); belly.position.set(0, 0.7, 0.12); fox.add(belly);
    for (const sx of [-1, 1]) {
      const leg = meshBox(0.1, 0.5, 0.12, DARK); leg.position.set(sx * 0.1, 0.25, 0); fox.add(leg);
      const arm = meshBox(0.08, 0.34, 0.1, ORANGE); arm.position.set(sx * 0.22, 0.78, 0); fox.add(arm);
    }
    const head = meshSphere(0.19, ORANGE); head.position.y = 1.12; fox.add(head);
    const snout = meshBox(0.12, 0.1, 0.14, CREAM); snout.position.set(0, 1.06, 0.16); fox.add(snout);
    const nose = meshSphere(0.03, DARK); nose.position.set(0, 1.08, 0.24); fox.add(nose);
    for (const sx of [-1, 1]) {
      const eye = meshSphere(0.025, DARK); eye.position.set(sx * 0.07, 1.16, 0.16); fox.add(eye);
      const ear = meshCone(0.07, 0.16, ORANGE); ear.position.set(sx * 0.13, 1.28, 0); fox.add(ear);
      const inner = meshCone(0.035, 0.1, CREAM); inner.position.set(sx * 0.13, 1.29, 0.02); fox.add(inner);
    }
    // Bushy tail with a cream tip.
    const tail = meshBox(0.12, 0.12, 0.3, ORANGE); tail.position.set(0, 0.62, -0.24); fox.add(tail);
    const tailTip = meshSphere(0.08, CREAM); tailTip.position.set(0, 0.63, -0.42); fox.add(tailTip);
    // A foreman's hard hat.
    const dome = meshSphere(0.17, HAT); dome.scale.set(1, 0.6, 1); dome.position.y = 1.24; fox.add(dome);
    const brim = meshCyl(0.21, 0.21, 0.03, HAT); brim.position.y = 1.19; fox.add(brim);
    return fox;
  }
  // --- Fox's podium: a small two-tier stand that lifts him a little, so he
  // reads as stationed at the head of the lineup, not standing loose. Same warm
  // palette as the pedestals. ---
  const podium = meshCyl(HUB.FOX_PODIUM_R, HUB.FOX_PODIUM_R * 1.06, HUB.FOX_PODIUM_H, HUB_COLOR.pedestal);
  podium.position.set(foxX, HUB.STAGE_TOP_Y + HUB.FOX_PODIUM_H / 2, HUB.ROW_Z);
  hubGroup.add(podium);
  const podiumCap = meshCyl(HUB.FOX_PODIUM_R * 1.05, HUB.FOX_PODIUM_R * 1.05, 0.03, HUB_COLOR.pedestalCap);
  podiumCap.position.set(foxX, HUB.STAGE_TOP_Y + HUB.FOX_PODIUM_H - 0.015, HUB.ROW_Z);
  hubGroup.add(podiumCap);

  const fox = buildHubFox();
  fox.position.set(foxX, HUB.STAGE_TOP_Y + HUB.FOX_PODIUM_H, HUB.ROW_Z); // standing on his podium
  hubGroup.add(fox); // built facing +z, toward the student

  // --- Fox's welcome is no longer a static bubble here. The student is welcomed
  // exactly once, by the OPENING ONBOARDING below (the goal card + Fox's tutorial),
  // which then leaves Fox resting on a calm "point at any place" line. The managed
  // tutorial speech bubble is built in that section (near Fox, at foxX). ---

  // --- One small low-poly landmark per stop, each on its own pedestal ---
  // Each is built diorama scale with its base at y = 0, then enlarged and lifted
  // onto a pedestal so the whole group bobs up and down as one piece.

  // Give a whole landmark a soft self-lit glow: each mesh emits a dim version of
  // its own color, so colors stay true but the piece reads as gently lit. The
  // touched materials are collected so the bob loop can pulse them per stop.
  function softGlow(obj: Group, intensity: number, collect?: any[]) {
    obj.traverse(function (child: any) {
      if (child.isMesh && child.material && child.material.color) {
        child.material.emissive = new Color(child.material.color.getHex());
        child.material.emissiveIntensity = intensity;
        if (collect) collect.push(child.material);
      }
    });
  }

  // A gold "visited" check badge: a bright disk facing the student with a white
  // tick across it. Shown on a pedestal front once that stop's done flag is true.
  function makeCheckBadge(): Group {
    const g = new Group();
    const disk = meshCyl(0.1, 0.1, 0.02, HUB_COLOR.badge, 20);
    disk.rotation.x = Math.PI / 2; // turn the flat face toward the student (+z)
    g.add(disk);
    const short = meshBox(0.022, 0.06, 0.012, HUB_COLOR.badgeCheck);
    short.position.set(-0.032, -0.006, 0.013); short.rotation.z = Math.PI / 4; g.add(short);
    const long = meshBox(0.022, 0.11, 0.012, HUB_COLOR.badgeCheck);
    long.position.set(0.022, 0.022, 0.013); long.rotation.z = -Math.PI / 5; g.add(long);
    // Self-lit so the gold and white read brightly without depending on scene light.
    g.traverse(function (c: any) {
      if (c.isMesh && c.material && c.material.color) {
        c.material.emissive = new Color(c.material.color.getHex());
        c.material.emissiveIntensity = 0.5;
      }
    });
    return g;
  }

  // tech: a tall thin glass office tower with window banding.
  function buildTechTower(): Group {
    const g = new Group();
    const GLASS = "#5bbbe0";
    const FRAME = "#2a6f8f";
    const tower = meshBox(0.085, 0.26, 0.085, GLASS); tower.position.y = 0.13; g.add(tower);
    for (const by of [0.07, 0.12, 0.17, 0.22]) {
      const band = meshBox(0.092, 0.012, 0.092, FRAME); band.position.y = by; g.add(band);
    }
    const cap = meshBox(0.05, 0.02, 0.05, FRAME); cap.position.y = 0.27; g.add(cap);
    const mast = meshCyl(0.004, 0.004, 0.05, "#cdd6db"); mast.position.y = 0.305; g.add(mast);
    return g;
  }

  // port: a dockside crane over a little ship loaded with stacked containers.
  function buildPortCrane(): Group {
    const g = new Group();
    const HULL = "#7a3d2c";
    const DECK = "#caa24a";
    const CRANE = "#e0a13a";
    // The ship: a hull with a small wheelhouse.
    const hull = meshBox(0.26, 0.06, 0.11, HULL); hull.position.set(0.02, 0.03, 0); g.add(hull);
    const deck = meshBox(0.24, 0.015, 0.09, DECK); deck.position.set(0.02, 0.065, 0); g.add(deck);
    const cabin = meshBox(0.05, 0.05, 0.07, "#f1e7d0"); cabin.position.set(0.11, 0.095, 0); g.add(cabin);
    // Stacked shipping containers in the three trade colors.
    const cont = [
      { c: "#cf4636", x: -0.05, y: 0.095 },
      { c: "#3f7fd0", x: 0.0,  y: 0.095 },
      { c: "#5fae4a", x: -0.025, y: 0.135 },
    ];
    for (const k of cont) {
      const box = meshBox(0.05, 0.04, 0.07, k.c); box.position.set(k.x, k.y, 0); g.add(box);
    }
    // The crane: a post on the dock side with a jib reaching over the deck.
    const post = meshBox(0.022, 0.2, 0.022, CRANE); post.position.set(-0.13, 0.1, 0.04); g.add(post);
    const jib = meshBox(0.18, 0.02, 0.022, CRANE); jib.position.set(-0.05, 0.2, 0.04); g.add(jib);
    const line = meshCyl(0.003, 0.003, 0.06, "#3a2a1c"); line.position.set(0.0, 0.17, 0.04); g.add(line);
    const hook = meshBox(0.04, 0.03, 0.05, "#caa24a"); hook.position.set(0.0, 0.13, 0.04); g.add(hook);
    return g;
  }

  // tourism: a low colonial brick building with a white cupola on top.
  function buildColonial(): Group {
    const g = new Group();
    const BRICK = "#b15c3c";
    const TRIM = "#f3ecdb";
    const ROOF = "#7c3b2a";
    const body = meshBox(0.2, 0.1, 0.13, BRICK); body.position.y = 0.05; g.add(body);
    const roof = meshBox(0.22, 0.022, 0.15, ROOF); roof.position.y = 0.108; g.add(roof);
    // White-trim windows and a door across the front (+z) face.
    for (const wx of [-0.06, 0.06]) {
      const win = meshBox(0.03, 0.045, 0.01, TRIM); win.position.set(wx, 0.06, 0.066); g.add(win);
    }
    const door = meshBox(0.03, 0.06, 0.01, TRIM); door.position.set(0, 0.03, 0.066); g.add(door);
    // The cupola: a small white tower with a gold spire.
    const cupola = meshBox(0.045, 0.05, 0.045, TRIM); cupola.position.y = 0.145; g.add(cupola);
    const dome = meshSphere(0.028, TRIM); dome.position.y = 0.178; g.add(dome);
    const spire = meshCone(0.012, 0.05, "#d9a441"); spire.position.y = 0.215; g.add(spire);
    return g;
  }

  // farm: a red barn with a small silo beside it.
  function buildFarm(): Group {
    const g = new Group();
    const BARN = "#bd3b2c";
    const ROOF = "#7c241a";
    const TRIM = "#f1e7d0";
    const SILO = "#d8d2c4";
    const barn = meshBox(0.17, 0.1, 0.12, BARN); barn.position.set(-0.03, 0.05, 0); g.add(barn);
    const roof = meshBox(0.19, 0.05, 0.14, ROOF); roof.position.set(-0.03, 0.115, 0); g.add(roof);
    const door = meshBox(0.05, 0.06, 0.01, TRIM); door.position.set(-0.03, 0.03, 0.061); g.add(door);
    const beam = meshBox(0.12, 0.008, 0.008, TRIM); beam.position.set(-0.03, 0.075, 0.061); g.add(beam);
    // The silo: a cylinder with a domed cap.
    const silo = meshCyl(0.035, 0.035, 0.15, SILO); silo.position.set(0.085, 0.075, 0.02); g.add(silo);
    const cap = meshSphere(0.035, "#b9b1a0"); cap.position.set(0.085, 0.15, 0.02); g.add(cap);
    return g;
  }

  const LANDMARK_BUILDERS: { [id: string]: () => Group } = {
    tech: buildTechTower,
    port: buildPortCrane,
    tourism: buildColonial,
    farm: buildFarm,
  };

  // Build the row, left to right in STOPS order: a pedestal, the enlarged
  // landmark on top, a floating title above, and a (hidden until done) badge.
  const hubLandmarks: {
    obj: Group; baseY: number; stop: any; glowMats: any[]; badge: Group; pad: any;
    entity: any; wasPressed: boolean;
  }[] = [];
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i];
    const build = LANDMARK_BUILDERS[stop.id];
    if (!build) continue;
    const px = HUB.ROW_CENTER_X + (i - 1) * HUB.SPACING; // even spacing, Fox holds -2

    // The pedestal: a short stone column with a lighter cap, same for all four.
    const pedH = HUB.PED_TOP_Y - HUB.STAGE_TOP_Y;
    const ped = meshCyl(HUB.PED_R, HUB.PED_R * 1.06, pedH, HUB_COLOR.pedestal);
    ped.position.set(px, HUB.STAGE_TOP_Y + pedH / 2, HUB.ROW_Z);
    hubGroup.add(ped);
    const cap = meshCyl(HUB.PED_R * 1.08, HUB.PED_R * 1.08, 0.03, HUB_COLOR.pedestalCap);
    cap.position.set(px, HUB.PED_TOP_Y - 0.015, HUB.ROW_Z);
    hubGroup.add(cap);

    // A soft "come here" glow pool on the pedestal top, in the stop's color. The
    // bob loop breathes it while the stop is unvisited and hides it once done, so
    // an unvisited place clearly reads as "come explore." Translucent so it glows.
    const pad = meshCyl(HUB.PED_R * LANDMARK.PAD_R, HUB.PED_R * LANDMARK.PAD_R, 0.02, stop.color, 24);
    pad.position.set(px, HUB.PED_TOP_Y + 0.012, HUB.ROW_Z);
    (pad.material as any).emissive = new Color(stop.color);
    (pad.material as any).transparent = true;
    hubGroup.add(pad);

    // The landmark, enlarged so the row fills the view, resting on the pedestal.
    const landmark = build();
    landmark.scale.setScalar(HUB.MODEL_SCALE);
    landmark.position.set(px, HUB.PED_TOP_Y, HUB.ROW_Z);
    const glowMats: any[] = [];
    softGlow(landmark, LANDMARK.GLOW, glowMats);

    // A see-through hit box so a small landmark (the thin tech tower especially) is
    // still easy to point at: invisible, but it still raycasts, so it just enlarges
    // the target. Added after softGlow so it is not tinted, and it rides inside the
    // landmark group so it scales and bobs along with it.
    const hit = meshBox(0.3, 0.46, 0.3, "#ffffff");
    hit.castShadow = false;
    hit.receiveShadow = false;
    const hitMat = hit.material as any;
    hitMat.transparent = true;
    hitMat.opacity = 0;
    hitMat.depthWrite = false;
    hit.position.set(0, 0.22, 0);
    landmark.add(hit);

    // Make the whole landmark a ray target, the SAME pointing mechanism the panels
    // use (Interactable). createTransformEntity reparents it to the scene root, but
    // hubGroup sits at the origin so the coordinates above place it identically. We
    // keep the entity so the loops can read Hovered / Pressed, and so the hub
    // hide/show can toggle it alongside the rest of the lineup.
    const landmarkEntity = world.createTransformEntity(landmark).addComponent(Interactable);

    // The floating title card: place name, region line, and flavor tagline. It is
    // compact and sits just above this landmark, aligned with the other cards.
    const title = makeTitleCard(stop.name, stop.region, stop.tagline, HUB.TITLE_W);
    title.position.set(px, HUB.TITLE_Y, HUB.ROW_Z);
    hubGroup.add(title);

    // The gold visited check on the pedestal front; the bob loop shows/hides it.
    const badge = makeCheckBadge();
    badge.position.set(px, HUB.BADGE_Y, HUB.ROW_Z + HUB.PED_R + 0.02);
    badge.visible = stop.done;
    hubGroup.add(badge);

    hubLandmarks.push({ obj: landmark, baseY: HUB.PED_TOP_Y, stop, glowMats, badge, pad, entity: landmarkEntity, wasPressed: false });
  }

  // When true, the opening onboarding forces all four landmarks into their bright
  // "pointed at" look at once, so Fox can gesture toward the whole row on his fourth
  // tutorial line. The bob loop below reads it as one more reason a landmark glows.
  let introHighlightLandmarks = false;

  // One gentle loop drives the bob, the visited state, AND the point-at highlight,
  // so flipping a stop's done flag (or pointing at it) later just works. setInterval,
  // not rAF (rAF pauses in the headset).
  let bobT = 0;
  setInterval(function () {
    bobT += 0.033;
    for (let i = 0; i < hubLandmarks.length; i++) {
      const lm = hubLandmarks[i];
      // Bob: all four drift up and down, phase-staggered so they feel alive.
      lm.obj.position.y =
        lm.baseY + Math.sin(bobT * LANDMARK.BOB_SPEED + i * LANDMARK.BOB_STAGGER) * LANDMARK.BOB_AMP;

      // Is the student pointing at this landmark right now? Hovered while the ray
      // rests on it, Pressed the instant they select. Drives the "this is the
      // target" highlight, layered over whatever the pulse/done look is doing.
      const pointed =
        introHighlightLandmarks || lm.entity.hasComponent(Hovered) || lm.entity.hasComponent(Pressed);

      let glow: number;
      if (lm.stop.done) {
        // Finished: pulse off, a calm steady glow, the gold check showing, the
        // inviting glow pool gone (the check now says "done", not "come here").
        glow = LANDMARK.DONE_GLOW;
        lm.badge.visible = true;
        lm.pad.visible = false;
      } else {
        // Unvisited: breathe the landmark glow AND the floor pool to invite a
        // visit, no badge. The pool swells, brightens, and fades as it breathes;
        // pointing at it snaps the pool to its brightest so the cue is obvious.
        const t = 0.5 + 0.5 * Math.sin(bobT * LANDMARK.PULSE_SPEED + i * LANDMARK.BOB_STAGGER);
        glow = LANDMARK.PULSE_MIN + (LANDMARK.PULSE_MAX - LANDMARK.PULSE_MIN) * t;
        lm.badge.visible = false;
        lm.pad.visible = true;
        const pt = pointed ? 1 : t;
        const pm = lm.pad.material;
        pm.emissiveIntensity = LANDMARK.PAD_GLOW_MIN + (LANDMARK.PAD_GLOW_MAX - LANDMARK.PAD_GLOW_MIN) * pt;
        pm.opacity = LANDMARK.PAD_OP_MIN + (LANDMARK.PAD_OP_MAX - LANDMARK.PAD_OP_MIN) * pt;
        const s = 1 + LANDMARK.PAD_SCALE_AMP * pt;
        lm.pad.scale.set(s, 1, s);
      }

      // The point-at highlight itself: brighten the glow and grow the landmark a
      // touch, in either state, so the student always knows which place a press
      // will enter. One owner of glow + scale keeps it from fighting the pulse.
      if (pointed) glow = LANDMARK.HOVER_GLOW;
      for (const m of lm.glowMats) m.emissiveIntensity = glow;
      lm.obj.scale.setScalar(HUB.MODEL_SCALE * (pointed ? LANDMARK.HOVER_SCALE : 1));
    }
  }, 33);

  // ======================================================================
  // MODULE 6 VISIT LOOP  —  point at a landmark, travel into that stop, run its
  // (placeholder) challenge, finish, and travel back to the map. This is the
  // reusable SHELL; the real per-stop challenges drop into showStop() later.
  // Everything reads the VISIT tunables; nothing is hardcoded inline. Every loop
  // is setInterval (rAF pauses in the headset).
  // ======================================================================
  const VISIT = {
    // The travel fade: a calm, slow dip to a solid color and back, never a flash.
    FADE_COLOR: "#0e1c2b",   // calm deep navy to dip through (not pure black)
    FADE_MS: 700,            // time to fade fully OUT, and again to fade fully IN
    FADE_HOLD_MS: 140,       // a short beat held at full cover while the world swaps
    FADE_DIST: 0.4,          // how far in front of the eye the cover sits (metres)
    FADE_SIZE: 6,            // cover size; oversized so it always fills the view
    TICK_MS: 33,             // loop rate for the fade and the point-to-select watch
    // The placeholder INSIDE a stop: a title/description panel and one big button.
    PANEL_POS: [0, 1.72, 3.3] as [number, number, number], // ahead of the spawn, kid eye height
    PANEL_W: 2.1,            // description panel width (metres)
    BTN_POS: [1.7, 0.9, 3.45] as [number, number, number],  // the Finish button, to the lower-RIGHT so the model stays in view
    BTN_W: 1.3,              // button width (metres)
    BTN_H: 0.36,             // button height (metres)
    BTN_HOVER_SCALE: 1.06,   // gentle grow while pointed at
    BTN_PRESS_SCALE: 0.95,   // quick squish on press
    // PLACEHOLDER award handed to completeStop on Finish. Real per-challenge
    // scoring (the three meters in CLAUDE.md) replaces this in a later prompt.
    PLACEHOLDER_AWARD: { economic: 20, innovation: 20, problem: 20 },
  };

  // The one gate that decides what a point/press does: "intro" (the opening
  // onboarding is running, the map is NOT yet explorable), "hub" (the map reacts),
  // "fading" (mid-travel, nothing reacts), or "stop" (only Finish reacts). It
  // starts at "intro" so no landmark can be selected until the onboarding finishes
  // or is skipped; the onboarding flips it to "hub" to open exploration.
  let currentView = "intro";
  let activeStopId: string | null = null;
  // The REAL per-stop award handed to completeStop on Finish. A decision-pack stop
  // (the runner) sets this to the student's true tally; a placeholder stop leaves
  // it null and falls back to VISIT.PLACEHOLDER_AWARD. Reset on every enterStop.
  let pendingAward: { economic: number; innovation: number; problem: number } | null = null;

  // ---- SCORING SPINE ----  Each finished stop stores ONE award, keyed by id; the
  // running totals are the SUM of those awards. Finishing a stop again just
  // overwrites its award, so a re-visit never double counts (prompt step 6). The
  // visible meters panel and the report card arrive in the next prompt; for now we
  // keep the numbers and log them.
  const M6_AWARDS: Record<string, { economic: number; innovation: number; problem: number }> = {};
  const m6Totals = { economic: 0, innovation: 0, problem: 0 };
  function recomputeM6Totals() {
    let ec = 0, inn = 0, pr = 0;
    for (const id in M6_AWARDS) {
      ec += M6_AWARDS[id].economic;
      inn += M6_AWARDS[id].innovation;
      pr += M6_AWARDS[id].problem;
    }
    // Meters live 0..100; clamp so placeholder sums never run past the top.
    m6Totals.economic = Math.max(0, Math.min(100, ec));
    m6Totals.innovation = Math.max(0, Math.min(100, inn));
    m6Totals.problem = Math.max(0, Math.min(100, pr));
  }
  function completeStop(stopId: string, award: { economic: number; innovation: number; problem: number }) {
    M6_AWARDS[stopId] = award;          // overwrite, never add
    const stop = STOPS.find(function (s) { return s.id === stopId; });
    if (stop) stop.done = true;          // lights the gold check, stops the invite glow
    recomputeM6Totals();
    saveProgress();                      // persist so a headset sleep / refresh never wipes the tour
    console.log("[M6] finished " + stopId + " with award", award, "=> totals", m6Totals);
  }

  // PROGRESS PERSISTENCE (Phase 4.1). A 30-minute classroom session must survive a
  // headset sleep, a crash, or an accidental refresh, so the per-stop awards live in
  // localStorage. That is all we need: the done flags and m6Totals are derived from
  // it. Everything is wrapped in try/catch, because private-mode or a full quota must
  // never break the experience (it just will not persist). ?fresh=1 forces a clean
  // start for the next class.
  const SAVE_KEY = "virginiaVenturesM6.progress.v1";
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, awards: M6_AWARDS })); }
    catch (e) { /* storage unavailable: the tour simply will not persist */ }
  }
  function clearProgress() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }
  function loadSavedAwards(): Record<string, { economic: number; innovation: number; problem: number }> | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.awards || typeof data.awards !== "object") return null;
      const out: Record<string, { economic: number; innovation: number; problem: number }> = {};
      for (const id of STOPS.map(function (s) { return s.id; })) {   // only trust known stop ids
        const a = data.awards[id];
        if (a && typeof a.economic === "number" && typeof a.innovation === "number" && typeof a.problem === "number") {
          out[id] = { economic: a.economic, innovation: a.innovation, problem: a.problem };
        }
      }
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  }
  function restoreProgress(awards: Record<string, { economic: number; innovation: number; problem: number }>) {
    for (const id in awards) {
      M6_AWARDS[id] = awards[id];
      const stop = STOPS.find(function (s) { return s.id === id; });
      if (stop) stop.done = true;        // its gold check lights on the restored map
    }
    recomputeM6Totals();
  }

  // The current stop's IN-PROGRESS contribution to the three meters, updated live as
  // the student picks (decision stops) or loads containers (Port), reset on entering a
  // stop. The in-stop meter (below) previews m6Totals with the active stop's committed
  // award swapped for this, so the bars move mid-stop instead of only at the hub.
  const stopPreview = { economic: 0, innovation: 0, problem: 0 };
  function resetStopPreview() { stopPreview.economic = 0; stopPreview.innovation = 0; stopPreview.problem = 0; }
  function previewTotals() {
    let ec = 0, inn = 0, pr = 0;
    for (const id in M6_AWARDS) {
      if (id === activeStopId) continue; // the live preview replaces this stop's committed award
      ec += M6_AWARDS[id].economic; inn += M6_AWARDS[id].innovation; pr += M6_AWARDS[id].problem;
    }
    return {
      economic: Math.max(0, Math.min(100, ec + stopPreview.economic)),
      innovation: Math.max(0, Math.min(100, inn + stopPreview.innovation)),
      problem: Math.max(0, Math.min(100, pr + stopPreview.problem)),
    };
  }

  // ---- THE TRAVEL FADE ----  A solid quad that rides just in front of the camera,
  // square to the view, whose opacity we animate on setInterval. At full cover we
  // swap the world (onCover); when clear again we settle the view state (onDone).
  // The same slow fade runs both directions, so entering and leaving feel identical.
  const fadeMat = new MeshBasicMaterial({
    color: new Color(VISIT.FADE_COLOR),
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  const fadeQuad = new Mesh(new PlaneGeometry(VISIT.FADE_SIZE, VISIT.FADE_SIZE), fadeMat);
  fadeQuad.renderOrder = 100000;     // over the whole world AND any panel
  fadeQuad.frustumCulled = false;
  fadeQuad.visible = false;
  (fadeQuad as any).pointerEvents = "none";
  scene.add(fadeQuad);

  let fadePhase = "idle"; // "idle" | "out" | "hold" | "in"
  let fadeElapsed = 0;
  let fadeOnCover: (() => void) | null = null;
  let fadeOnDone: (() => void) | null = null;
  const _fadeEye = new Vector3();
  const _fadeFwd = new Vector3();

  function startFade(onCover: () => void, onDone: () => void) {
    fadeOnCover = onCover;
    fadeOnDone = onDone;
    fadeElapsed = 0;
    fadePhase = "out";
    fadeQuad.visible = true;
  }

  setInterval(function () {
    if (!fadeQuad.visible) return;
    // Ride just in front of the camera, square to the view, so it fills the screen.
    const cam = world.camera as any;
    cam.getWorldPosition(_fadeEye);
    cam.getWorldDirection(_fadeFwd);
    _fadeFwd.normalize();
    fadeQuad.position.set(
      _fadeEye.x + _fadeFwd.x * VISIT.FADE_DIST,
      _fadeEye.y + _fadeFwd.y * VISIT.FADE_DIST,
      _fadeEye.z + _fadeFwd.z * VISIT.FADE_DIST,
    );
    fadeQuad.quaternion.copy(cam.quaternion);

    if (fadePhase === "out") {
      fadeElapsed += VISIT.TICK_MS;
      fadeMat.opacity = Math.min(1, fadeElapsed / VISIT.FADE_MS);
      if (fadeElapsed >= VISIT.FADE_MS) {
        fadeMat.opacity = 1;
        if (fadeOnCover) fadeOnCover();
        fadePhase = "hold";
        fadeElapsed = 0;
      }
    } else if (fadePhase === "hold") {
      fadeElapsed += VISIT.TICK_MS;
      if (fadeElapsed >= VISIT.FADE_HOLD_MS) {
        fadePhase = "in";
        fadeElapsed = 0;
      }
    } else if (fadePhase === "in") {
      fadeElapsed += VISIT.TICK_MS;
      fadeMat.opacity = Math.max(0, 1 - fadeElapsed / VISIT.FADE_MS);
      if (fadeElapsed >= VISIT.FADE_MS) {
        fadeMat.opacity = 0;
        fadeQuad.visible = false;
        fadePhase = "idle";
        if (fadeOnDone) fadeOnDone();
      }
    }
  }, VISIT.TICK_MS);

  // ---- HIDE / SHOW THE HUB ----  The stage, ground, Fox, pedestals, titles and
  // badges all live in hubGroup; the four landmark MODELS are their own ray-target
  // entities, so we toggle them alongside it. (Selection is also gated on
  // currentView, so a hidden landmark can never start a visit on its own.)
  function hideHub() {
    hubGroup.visible = false;
    for (const lm of hubLandmarks) if (lm.entity.object3D) lm.entity.object3D.visible = false;
  }
  function showHub() {
    hubGroup.visible = true;
    for (const lm of hubLandmarks) if (lm.entity.object3D) lm.entity.object3D.visible = true;
  }

  // ---- THE STOP SHELL (placeholder inside) ----  A description panel plus one big
  // Finish button, parked ahead of the spawn. The button label never changes, so it
  // is built once; only the panel's words are rebuilt per stop. The real challenge
  // replaces what showStop()/hideStop() put INSIDE, not this shell around it.
  const stopHolder = new Group();
  scene.add(stopHolder);
  stopHolder.visible = false;
  let stopPanelMesh: any = null;

  const finishBtnMesh = makeButtonCard("Finish and return to the map", VISIT.BTN_W, VISIT.BTN_H);
  finishBtnMesh.position.set(VISIT.BTN_POS[0], VISIT.BTN_POS[1], VISIT.BTN_POS[2]);
  (finishBtnMesh.material as any).depthTest = false; // always readable over the sky
  (finishBtnMesh.material as any).depthWrite = false;
  finishBtnMesh.renderOrder = 50000;
  const finishBtn = world.createTransformEntity(finishBtnMesh).addComponent(Interactable);
  if (finishBtn.object3D) finishBtn.object3D.visible = false;
  let finishWasPressed = false;

  // The Port of Virginia's custom game controller, built once below (after its
  // scene is registered) and driven by showStop/hideStop + its own loop.
  let portGame: { group: Group; start: () => void; stop: () => void; tick: () => void } | null = null;

  function showStop(stop: any) {
    // A stop with a decision pack runs through the reusable RUNNER (its own calm
    // scene, setup line, decisions, readout, and the shared finish button). Stops
    // without a pack yet keep the simple placeholder panel + finish button below.
    const pack = DECISION_PACKS[stop.id];
    if (pack) {
      showStopScene(stop.id);
      // Start the stop's quiet ambience now the student is inside. Entering the
      // stop was itself an interaction (the landmark press), so the AudioContext is
      // already allowed to play: the Tech Office gets its server-room hum, the
      // Tourism Hub gets its outdoor village murmur + birdsong, and the Modern Farm
      // gets a gentle rural breeze + birdsong.
      if (stop.id === "tech") startHum();
      else if (stop.id === "tourism") startVillageAmbience();
      else if (stop.id === "farm") startFarmAmbience();
      startDecisionPack(stop, pack);
      return;
    }
    // The Port of Virginia is the SIGNATURE stop: a custom container-loading game, not a
    // decision pack. Show its dock scene and start the game. The Port owns its OWN finish
    // flow (the shell's shared Finish button stays hidden): the student loads at their pace,
    // taps FINISH to end the round and bring up the result with the real pendingAward, then
    // taps RETURN to land the score (finishStop -> completeStop) and fade back to the map.
    if (stop.id === "port") {
      showStopScene("port");
      startPortAmbience(); // soft harbor wash + distant gulls; entry is the first action, so audio is unlocked
      if (portGame) portGame.start();
      return;
    }
    // Rebuild the description for THIS stop (cheap, and it happens under full cover).
    if (stopPanelMesh) stopHolder.remove(stopPanelMesh);
    stopPanelMesh = makeTextPanel(
      stop.name,
      "This is where you will run the " + stop.name + " challenge.",
      VISIT.PANEL_W,
    );
    (stopPanelMesh.material as any).depthTest = false;
    (stopPanelMesh.material as any).depthWrite = false;
    stopPanelMesh.renderOrder = 50000;
    stopPanelMesh.position.set(VISIT.PANEL_POS[0], VISIT.PANEL_POS[1], VISIT.PANEL_POS[2]);
    stopHolder.add(stopPanelMesh);
    stopHolder.visible = true;
    if (finishBtn.object3D) finishBtn.object3D.visible = true;
  }
  function hideStop() {
    stopHolder.visible = false;
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    hideRunner();          // clear any runner panels / option cards
    if (portGame) portGame.stop(); // park the Port's ships + grabbable containers
    hideAllStopScenes();   // and the calm per-stop backdrop
    stopHum();             // fade out the Tech Office room ambience as we leave
    stopVillageAmbience(); // fade out the Tourism village ambience as we leave
    stopFarmAmbience();    // fade out the Modern Farm rural ambience as we leave
    stopPortAmbience();    // fade out the Port harbor ambience as we leave
  }

  // ---- THE VISIT: enter on a landmark select, finish on the button ----
  function enterStop(stopId: string) {
    if (currentView !== "hub") return;   // only the map starts a visit
    const stop = STOPS.find(function (s) { return s.id === stopId; });
    if (!stop) return;
    currentView = "fading";
    activeStopId = stopId;
    pendingAward = null;                 // a fresh visit; the runner sets the real award
    resetStopPreview();                  // the in-stop meter starts from this stop's committed award
    sfxStage();                          // a soft travel cue
    startFade(
      function onCover() { hideHub(); showStop(stop); },
      function onDone() { currentView = "stop"; },
    );
  }
  function finishStop() {
    if (currentView !== "stop" || !activeStopId) return; // only a real Finish counts
    sfxClick();
    // The runner's REAL tally if this stop produced one this visit; otherwise the
    // placeholder (for stops whose challenge is not built yet).
    completeStop(activeStopId, pendingAward || VISIT.PLACEHOLDER_AWARD);
    pendingAward = null;
    currentView = "fading";
    startFade(
      function onCover() { hideStop(); showHub(); activeStopId = null; },
      function onDone() { currentView = "hub"; },
    );
  }

  // ---- POINT-TO-SELECT ----  Watch each landmark for a FRESH press (one that was
  // not pressed last tick, so a held trigger fires once), and the Finish button the
  // same way, with a little grow/squish while pointed at. setInterval, not rAF.
  setInterval(function () {
    for (const lm of hubLandmarks) {
      const pressed = !!lm.entity.hasComponent(Pressed);
      if (currentView === "hub" && pressed && !lm.wasPressed) enterStop(lm.stop.id);
      lm.wasPressed = pressed;
    }
    if (currentView === "stop") {
      const hov = !!finishBtn.hasComponent(Hovered);
      const prs = !!finishBtn.hasComponent(Pressed);
      finishBtnMesh.scale.setScalar(prs ? VISIT.BTN_PRESS_SCALE : (hov ? VISIT.BTN_HOVER_SCALE : 1));
      if (prs && !finishWasPressed) finishStop();
      finishWasPressed = prs;
    } else {
      finishBtnMesh.scale.setScalar(1);
      finishWasPressed = false;
    }
  }, VISIT.TICK_MS);

  // ======================================================================
  // DECISION RUNNER  —  the reusable engine the three lean stops share. It plays a
  // DECISION_PACK (data, defined up top) inside the stop shell: a calm scene, a
  // setup line, then each decision as a question with three pointable option cards
  // (the SAME Interactable pointing the hub landmarks use), a short interim readout
  // after each pick, and finally the shell's "Finish and return to the map" button
  // carrying the student's REAL tally. Only stops with a pack use it; the rest keep
  // the placeholder. Tune the layout here; every loop is setInterval (rAF pauses in
  // the headset).
  // ======================================================================
  const RUNNER = {
    INFO_W: 2.3,            // setup / closing panel width (m)
    Q_W: 2.3,              // question card width (m)
    READOUT_W: 2.3,        // interim readout width (m)
    // The panels ride ABOVE the build and the buttons BELOW it, so the data
    // center the student is assembling is never hidden behind a box. The model
    // tops out near eye height, so a panel centered at ~2.3 clears it.
    SETUP_PANEL_POS: [0, 2.3, 3.3] as [number, number, number],
    Q_PANEL_POS: [0, 2.34, 3.3] as [number, number, number],   // up top, cards below it
    READOUT_PANEL_POS: [0, 2.3, 3.3] as [number, number, number],
    CLOSE_PANEL_POS: [0, 2.3, 3.3] as [number, number, number],
    CARD_W: 2.5,           // option card width (m)
    CARD_H: 0.44,          // option card height (m)
    CARD_X: 0,             // option cards are centered in front of the student
    CARD_TOP_Y: 1.55,      // y of the FIRST (top) option card
    CARD_STEP: 0.54,       // center-to-center drop between option cards
    CARD_Z: 3.28,          // option cards distance in front of the spawn
    BTN_W: 1.6,            // Start / Next button size (m)
    BTN_H: 0.34,
    BTN_POS: [1.7, 0.9, 3.4] as [number, number, number], // lower-RIGHT, clear of the centered model AND the centered option cards
    HOVER_SCALE: 1.06,     // gentle grow while pointed at
    PRESS_SCALE: 0.95,     // quick squish on press
    READOUT_HOLD_MS: 900,  // keep the readout up this long to read BEFORE Next appears
    TICK_MS: 33,
  };

  // Draw a flat runner mesh OVER the calm scene and the sky (the same trick the
  // shell uses for its panels): no depth test, lifted render order.
  function runnerOnTop(mesh: any) {
    const m = mesh.material;
    m.depthTest = false;
    m.depthWrite = false;
    mesh.renderOrder = 50000;
  }

  // ---- THE SERVER ROOM  —  the place the Tech Office build sits inside. Two
  // rows of tall cabinets with slow-blinking status lights flank and back the
  // build, and a back wall carries two data screens (one breathing bars, one
  // scrolling log lines). Everything sits beyond the build's sides and behind
  // its front edge, so it never crosses in front of the panels or the build.
  // Returns its Group plus a tick(clock) the caller drives on setInterval (rAF
  // pauses in the headset). Only Tech Office has a room today; other stops can
  // build their own the same way. ----
  function buildTechStopScene(): { group: Group; tick: (clock: number) => void } {
    const R = TECH_ROOM;
    const g = new Group();

    // animated bits, all serviced by tick()
    const dots: { mesh: any; hz: number; phase: number; min: number; max: number }[] = [];
    const bars: { mesh: any; bottomY: number; maxH: number; hz: number; phase: number }[] = [];
    const lines: { mesh: any; topY: number; botY: number; speed: number }[] = [];

    function emissive(mesh: any, color: string, intensity: number) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = intensity;
      mesh.castShadow = false;
      return mesh;
    }

    // floor + an enclosing wall on three sides, so it reads as a room not a void.
    const floor = meshBox(12, 0.12, 13, R.FLOOR);
    floor.position.set(0, -0.06, 1.0);
    g.add(floor);
    const wall = meshBox(12, 3.8, 0.2, R.WALL);
    wall.position.set(0, 1.9, R.WALL_Z);
    g.add(wall);
    for (const sx of [-5.4, 5.4]) {
      const side = meshBox(0.2, 3.8, 11, R.WALL);
      side.position.set(sx, 1.9, -1.4);
      g.add(side);
    }

    // two rows of tall server cabinets, each studded with small status lights.
    let di = 0;
    for (const sgn of [-1, 1]) {
      const x = sgn * R.ROW_X;
      for (let r = 0; r < R.ROW_Z.length; r++) {
        const z = R.ROW_Z[r];
        const cab = meshBox(R.CAB_W, R.CAB_H, R.CAB_D, r % 2 === 0 ? R.CAB : R.CAB2);
        cab.position.set(x, R.CAB_H / 2, z);
        g.add(cab);
        const cap = meshBox(R.CAB_W + 0.05, 0.08, R.CAB_D + 0.05, R.CAP);
        cap.position.set(x, R.CAB_H, z);
        cap.castShadow = false;
        g.add(cap);
        // status lights on the front (+z) face, a 2 x 4 grid, each blinking slowly.
        const faceZ = z + R.CAB_D / 2 + 0.012;
        const palette = [R.DOT_CYAN, R.DOT_GREEN, R.DOT_CYAN, R.DOT_AMBER, R.DOT_GREEN, R.DOT_CYAN, R.DOT_GREEN, R.DOT_CYAN];
        let k = 0;
        for (const dx of [-0.22, 0.22]) {
          for (const dy of [0.5, 0.9, 1.3, 1.7]) {
            const col = palette[k % palette.length];
            const dot = meshBox(0.07, 0.07, 0.02, col);
            dot.position.set(x + dx, dy, faceZ);
            emissive(dot, col, 0.5);
            dots.push({ mesh: dot, hz: R.BLINK_HZ[(di + k) % R.BLINK_HZ.length], phase: (di + k) * 1.7, min: 0.06, max: 0.85 });
            g.add(dot);
            k++;
          }
        }
        // a soft steady seam of light down the inner edge of the cabinet.
        const seam = meshBox(0.03, 1.5, 0.02, R.DOT_CYAN);
        seam.position.set(x + (sgn < 0 ? 0.4 : -0.4), 1.15, faceZ);
        emissive(seam, R.DOT_CYAN, 0.22);
        g.add(seam);
        di += k;
      }
    }

    // a back-wall screen at cx; returns where to lay its data on the glass.
    function screenPanel(cx: number) {
      const sz = R.WALL_Z + 0.12;
      const bezel = meshBox(1.9, 1.2, 0.04, R.CAP);
      bezel.position.set(cx, R.SCREEN_Y, sz - 0.02);
      bezel.castShadow = false;
      g.add(bezel);
      const panel = meshBox(1.8, 1.1, 0.06, R.SCREEN_BG);
      panel.position.set(cx, R.SCREEN_Y, sz);
      emissive(panel, R.SCREEN_BG, 0.25);
      g.add(panel);
      return { cx, sz: sz + 0.04, midY: R.SCREEN_Y };
    }

    // Screen A: a row of data bars that breathe up and down, gently.
    {
      const s = screenPanel(-R.SCREEN_X);
      const bottomY = s.midY - 0.5;
      const maxH = 0.86;
      for (let i = 0; i < 7; i++) {
        const col = i % 2 === 0 ? R.SCREEN_A : R.SCREEN_B;
        const bar = meshBox(0.14, maxH, 0.03, col);
        bar.position.set(s.cx - 0.66 + i * 0.22, bottomY + maxH / 2, s.sz);
        emissive(bar, col, 0.7);
        bars.push({ mesh: bar, bottomY, maxH, hz: R.BAR_HZ * (0.7 + 0.1 * i), phase: i * 0.9 });
        g.add(bar);
      }
    }

    // Screen B: log lines that scroll slowly upward and wrap around.
    {
      const s = screenPanel(R.SCREEN_X);
      const topY = s.midY + 0.48;
      const botY = s.midY - 0.48;
      for (let i = 0; i < 5; i++) {
        const col = i % 2 === 0 ? R.SCREEN_B : R.SCREEN_A;
        const line = meshBox(1.45, 0.05, 0.03, col);
        line.position.set(s.cx, botY + (i / 5) * (topY - botY), s.sz);
        emissive(line, col, 0.6);
        lines.push({ mesh: line, topY, botY, speed: R.SCROLL_SPEED * (0.8 + 0.1 * i) });
        g.add(line);
      }
    }

    // The gentle motion. Blinks are smooth sine fades (no hard on/off), bars
    // breathe, lines drift. All slow; the caller ticks this on setInterval.
    function tick(clock: number) {
      const t = clock / 1000;
      for (const d of dots) {
        d.mesh.material.emissiveIntensity = d.min + (d.max - d.min) * (0.5 + 0.5 * Math.sin(2 * Math.PI * d.hz * t + d.phase));
      }
      for (const b of bars) {
        const s = 0.18 + 0.78 * (0.5 + 0.5 * Math.sin(2 * Math.PI * b.hz * t + b.phase));
        b.mesh.scale.y = s;
        b.mesh.position.y = b.bottomY + (b.maxH * s) / 2;
      }
      const dt = STAGING.TICK_MS / 1000;
      for (const l of lines) {
        let y = l.mesh.position.y + l.speed * dt;
        if (y > l.topY) y = l.botY;
        l.mesh.position.y = y;
      }
    }

    return { group: g, tick };
  }

  // ---- Tourism Hub: a calm Colonial Williamsburg VILLAGE wrapped around the build,
  // the outdoor counterpart to the Tech Office server room. A grassy green + sandy
  // path, a few primitive colonial buildings + far rooftops lining the sides and
  // back, a low white rail fence, trees, a flag, a well, and a few slow distant
  // visitors. Warm daytime palette. Everything obeys TOURISM_VILLAGE's clearance
  // rule (tall props at |x| >= CLEAR_X unless behind the build at z <= BACK_Z; low
  // props just clear the build footprint), so the village never sits in front of
  // the decision panels, the build spot, or the assembling scene. Returns its Group
  // + a tick(clock) the caller drives on setInterval (rAF pauses in the headset).
  // Same { group, tick } contract the server room uses. ----
  function buildTourismStopScene(): { group: Group; tick: (clock: number) => void } {
    const V = TOURISM_VILLAGE;
    const C = V.COLOR;
    const g = new Group();
    const swayers: { mesh: any; baseX: number; amp: number; phase: number }[] = [];
    const flags: { mesh: any; phase: number }[] = [];
    const visitors: { g: Group; baseX: number; phase: number }[] = [];

    // the green underfoot, wide enough to replace the indoor floor with open lawn,
    // plus a sandy path leading from the student up into the village.
    const grass = meshBox(16, 0.12, 16, C.grass);
    grass.position.set(0, V.GROUND_Y, 0.5);
    g.add(grass);
    const approach = meshBox(1.6, 0.02, 9, C.path);
    approach.position.set(0.2, 0.01, 3.6);
    g.add(approach);

    // a colonial building from primitives: brick/clapboard body, a hip roof (a
    // 4-sided pyramid, faces aligned to the walls), a chimney, white trim, a door,
    // and two plain daylight windows on the front (+z, toward the student). Windows
    // are NOT emissive, so the backdrop never glows or competes with the build.
    function colonialBuilding(
      x: number, z: number, w: number, h: number, d: number,
      wallKey: string, roofKey: string, kind: string,
    ) {
      const wall = (C as any)[wallKey], roofC = (C as any)[roofKey];
      const body = meshBox(w, h, d, wall);
      body.position.set(x, h / 2, z);
      g.add(body);
      const span = Math.max(w, d);
      const roofH = span * 0.42;
      const roof = meshCone(span * 0.8, roofH, roofC, 4);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(x, h + roofH / 2, z);
      g.add(roof);
      const chim = meshBox(0.12, 0.34, 0.12, C.chimney);
      chim.position.set(x + w * 0.28, h + 0.2, z - d * 0.18);
      g.add(chim);
      const fz = z + d / 2 + 0.012;
      const trim = meshBox(w * 0.96, 0.06, 0.02, C.trim);
      trim.position.set(x, h - 0.05, fz);
      g.add(trim);
      const door = meshBox(0.16, 0.3, 0.02, C.door);
      door.position.set(x, 0.15, fz);
      g.add(door);
      for (const wx of [x - w * 0.26, x + w * 0.26]) {
        const win = meshBox(0.16, 0.18, 0.02, C.window);
        win.position.set(wx, h * 0.55, fz);
        g.add(win);
      }
      if (kind === "meeting") {
        const cup = meshBox(0.22, 0.18, 0.22, C.cupola);
        cup.position.set(x, h + roofH + 0.09, z);
        g.add(cup);
        const spire = meshCone(0.08, 0.26, C.spire, 8);
        spire.position.set(x, h + roofH + 0.3, z);
        g.add(spire);
      }
    }
    for (const b of V.HOUSES) {
      colonialBuilding(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
    }
    // simple far rooftops for a town skyline (body + roof), well behind everything.
    for (const rp of V.FAR_ROOFS) {
      const house = meshBox(1.1, 0.7, 1.0, C.brickA);
      house.position.set(rp[0], 0.35, rp[1]);
      g.add(house);
      const roof = meshCone(0.95, 0.5, C.roofA, 4);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(rp[0], 0.9, rp[1]);
      g.add(roof);
    }

    // a leafy tree: a trunk + a canopy that sways slowly side to side.
    for (const sp of V.TREES) {
      const s = sp[2];
      const trunk = meshCyl(0.1 * s, 0.14 * s, 1.1 * s, C.trunk);
      trunk.position.set(sp[0], 0.55 * s, sp[1]);
      g.add(trunk);
      const canopy = meshSphere(0.68 * s, C.leaf);
      canopy.position.set(sp[0], 1.25 * s, sp[1]);
      g.add(canopy);
      swayers.push({ mesh: canopy, baseX: sp[0], amp: V.TREE_SWAY * s, phase: sp[0] * 0.7 + sp[1] * 0.3 });
    }

    // a low white rail fence (two rails + sparse posts) lining the green's edges.
    for (const fc of V.FENCES) {
      const fx = fc[0], fz = fc[1], len = fc[2], axis = fc[3];
      for (const ry of [V.FENCE_H * 0.55, V.FENCE_H]) {
        const rail = axis === "z" ? meshBox(0.04, 0.04, len, C.fence) : meshBox(len, 0.04, 0.04, C.fence);
        rail.position.set(fx, ry, fz);
        g.add(rail);
      }
      const n = Math.max(2, Math.round(len / 0.9));
      for (let i = 0; i <= n; i++) {
        const f = i / n - 0.5;
        const post = meshBox(0.05, V.FENCE_H + 0.06, 0.05, C.fence);
        post.position.set(axis === "x" ? fx + f * len : fx, (V.FENCE_H + 0.06) / 2, axis === "z" ? fz + f * len : fz);
        g.add(post);
      }
    }

    // a tall flagpole on the green with a colonial banner that waves gently.
    const pole = meshCyl(0.035, 0.035, 2.4, C.flagpole);
    pole.position.set(V.FLAG_POS[0], 1.2, V.FLAG_POS[2]);
    g.add(pole);
    const flag = meshBox(0.7, 0.42, 0.03, C.banner);
    flag.position.set(V.FLAG_POS[0] + 0.35, 2.12, V.FLAG_POS[2]);
    g.add(flag);
    flags.push({ mesh: flag, phase: 0 });

    // a little colonial well for charm, behind the build.
    {
      const wx = V.WELL_POS[0], wz = V.WELL_POS[2];
      const stone = meshCyl(0.22, 0.24, 0.4, C.wellStone);
      stone.position.set(wx, 0.2, wz);
      g.add(stone);
      for (const sx of [-0.2, 0.2]) {
        const wpost = meshCyl(0.025, 0.025, 0.5, C.flagpole);
        wpost.position.set(wx + sx, 0.55, wz);
        g.add(wpost);
      }
      const wroof = meshCone(0.34, 0.2, C.wellRoof, 4);
      wroof.rotation.y = Math.PI / 4;
      wroof.position.set(wx, 0.9, wz);
      g.add(wroof);
    }

    // a few distant visitors strolling the green edges (a body + head Group we can
    // bob/sway). Slow and calm; well clear of the build footprint.
    for (const vp of V.VISITORS) {
      const vg = new Group();
      const body = meshCyl(0.06, 0.08, 0.28, (C as any)[vp[2]]);
      body.position.set(0, 0.14, 0);
      vg.add(body);
      const head = meshSphere(0.08, C.head);
      head.position.set(0, 0.34, 0);
      vg.add(head);
      vg.position.set(vp[0], 0, vp[1]);
      g.add(vg);
      visitors.push({ g: vg, baseX: vp[0], phase: vp[0] * 1.7 + vp[1] });
    }

    // The gentle life: canopies drift, the flag waves, distant visitors bob and
    // sway slowly. All slow, nothing flashes; the caller ticks this on setInterval.
    function tick(clock: number) {
      const t = clock / 1000;
      for (const s of swayers) {
        s.mesh.position.x = s.baseX + Math.sin(2 * Math.PI * V.TREE_HZ * t + s.phase) * s.amp;
      }
      for (const f of flags) {
        const w = Math.sin(2 * Math.PI * V.FLAG_HZ * t + f.phase);
        f.mesh.rotation.z = w * V.FLAG_SWING;
        f.mesh.scale.x = 1 + 0.12 * w;
      }
      for (const v of visitors) {
        v.g.position.y = Math.abs(Math.sin(2 * Math.PI * V.VISITOR_HZ * t + v.phase)) * V.VISITOR_BOB;
        v.g.position.x = v.baseX + Math.sin(2 * Math.PI * V.VISITOR_HZ * 0.5 * t + v.phase) * V.VISITOR_SWAY;
      }
    }

    return { group: g, tick };
  }

  // ---- Modern Farm: a calm Shenandoah Valley wrapped around the build, the outdoor
  // counterpart to the Tech Office server room and the Tourism village. Rolling green
  // underfoot, the Blue Ridge mountains hazing the horizon, distant cropland stripes,
  // a red barn + silo (echoing the hub landmark), a slowly turning windmill, split-rail
  // fences, hay bales, trees, and a few drifting clouds. Everything obeys FARM_VALLEY's
  // clearance rule (tall props at |x| >= CLEAR_X unless behind the build at z <= BACK_Z;
  // low props just clear the footprint), so the valley never sits in front of the panels,
  // the build spot, or the assembling field. Same { group, tick } contract the server
  // room and village use; the caller ticks it on setInterval (rAF pauses in the headset). ----
  function buildFarmStopScene(): { group: Group; tick: (clock: number) => void } {
    const V = FARM_VALLEY;
    const C = V.COLOR;
    const g = new Group();
    const swayers: { mesh: any; baseX: number; amp: number; phase: number }[] = [];
    const clouds: { g: Group; baseX: number; phase: number }[] = [];
    const fans: { g: Group }[] = [];

    // the valley floor + a dirt lane leading from the student up into the farm.
    const grass = meshBox(16, 0.12, 16, C.grass);
    grass.position.set(0, V.GROUND_Y, 0.5);
    g.add(grass);
    const lane = meshBox(1.6, 0.02, 9, C.path);
    lane.position.set(0.2, 0.01, 3.6);
    g.add(lane);

    // the Blue Ridge: wide, low, rounded ridges sunk into the horizon (a flattened
    // sphere shows just its dome, so it reads as a soft mountain line, never a hard edge).
    for (const r of V.RIDGES) {
      const ridge = meshSphere(1, (C as any)[r[4]]);
      ridge.scale.set(r[2] / 2, r[3], 1.6);
      ridge.position.set(r[0], V.GROUND_Y - r[3] * 0.45, r[1]);
      g.add(ridge);
    }

    // rolling green hills between the valley floor and the Blue Ridge: the same
    // flattened-sphere swells, greener, lower, and a touch nearer, so the ground
    // reads as gently rolling rather than flat. All sit behind the build.
    for (const h of V.HILLS) {
      const hill = meshSphere(1, (C as any)[h[4]]);
      hill.scale.set(h[2] / 2, h[3], 2.2);
      hill.position.set(h[0], V.GROUND_Y - h[3] * 0.55, h[1]);
      g.add(hill);
    }

    // distant cropland stripes: low wide slabs that drift a touch in the wind.
    for (const f of V.FIELDS) {
      const slab = meshBox(f[2], 0.04, f[3], (C as any)[f[4]]);
      slab.position.set(f[0], V.GROUND_Y + 0.02, f[1]);
      g.add(slab);
      swayers.push({ mesh: slab, baseX: f[0], amp: V.CROP_SWAY, phase: f[0] * 0.6 + f[1] * 0.2 });
    }

    // the red barn (matching the hub landmark): body + roof + white door & trim beam.
    {
      const x = V.BARN_POS[0], z = V.BARN_POS[2];
      const body = meshBox(1.4, 0.95, 1.2, C.barn);
      body.position.set(x, 0.475, z);
      g.add(body);
      const roof = meshBox(1.55, 0.28, 1.32, C.barnRoof);
      roof.position.set(x, 1.05, z);
      g.add(roof);
      const fz = z + 0.62;
      const door = meshBox(0.42, 0.55, 0.02, C.barnTrim);
      door.position.set(x, 0.275, fz);
      g.add(door);
      const beamH = meshBox(0.42, 0.05, 0.02, C.barn);
      beamH.position.set(x, 0.36, fz + 0.005);
      g.add(beamH);
      const beamV = meshBox(0.05, 0.55, 0.02, C.barn);
      beamV.position.set(x, 0.275, fz + 0.005);
      g.add(beamV);
    }
    // a grain silo beside the barn: a tall cylinder with a domed cap.
    {
      const x = V.SILO_POS[0], z = V.SILO_POS[2];
      const silo = meshCyl(0.32, 0.32, 1.3, C.silo);
      silo.position.set(x, 0.65, z);
      g.add(silo);
      const cap = meshSphere(0.32, C.siloCap);
      cap.scale.y = 0.6;
      cap.position.set(x, 1.3, z);
      g.add(cap);
    }
    // a classic farm windmill: a tapered tower with a multi-blade fan that turns
    // slowly, plus a tail vane. The fan is a child Group we spin in tick().
    {
      const x = V.WINDMILL_POS[0], z = V.WINDMILL_POS[2];
      const tower = meshCyl(0.05, 0.15, 2.2, C.windmillTower);
      tower.position.set(x, 1.1, z);
      g.add(tower);
      const fan = new Group();
      fan.position.set(x, 2.2, z + 0.12);
      const hub = meshCyl(0.06, 0.06, 0.06, C.windmillTower);
      hub.rotation.x = Math.PI / 2;
      fan.add(hub);
      for (let i = 0; i < 7; i++) {
        const blade = meshBox(0.62, 0.07, 0.015, C.windmillBlade);
        blade.rotation.z = (i / 7) * Math.PI * 2;
        fan.add(blade);
      }
      g.add(fan);
      fans.push({ g: fan });
      // the tail vane behind the tower.
      const boom = meshBox(0.5, 0.02, 0.02, C.windmillTower);
      boom.position.set(x, 2.2, z - 0.28);
      g.add(boom);
      const vane = meshBox(0.02, 0.22, 0.26, C.windmillBlade);
      vane.position.set(x, 2.2, z - 0.5);
      g.add(vane);
    }

    // leafy trees framing the valley: a trunk + a canopy that sways slowly.
    for (const sp of V.TREES) {
      const s = sp[2];
      const trunk = meshCyl(0.1 * s, 0.14 * s, 1.1 * s, C.trunk);
      trunk.position.set(sp[0], 0.55 * s, sp[1]);
      g.add(trunk);
      const canopy = meshSphere(0.68 * s, C.leaf);
      canopy.position.set(sp[0], 1.25 * s, sp[1]);
      g.add(canopy);
      swayers.push({ mesh: canopy, baseX: sp[0], amp: V.TREE_SWAY * s, phase: sp[0] * 0.7 + sp[1] * 0.3 });
    }

    // low split-rail wood fences (three rails + posts) lining the field's edges.
    for (const fc of V.FENCES) {
      const fx = fc[0], fz = fc[1], len = fc[2], axis = fc[3];
      for (const ry of [V.FENCE_H * 0.4, V.FENCE_H * 0.7, V.FENCE_H]) {
        const rail = axis === "z" ? meshBox(0.05, 0.04, len, C.fence) : meshBox(len, 0.04, 0.05, C.fence);
        rail.position.set(fx, ry, fz);
        g.add(rail);
      }
      const n = Math.max(2, Math.round(len / 1.0));
      for (let i = 0; i <= n; i++) {
        const f = i / n - 0.5;
        const post = meshBox(0.07, V.FENCE_H + 0.08, 0.07, C.fence);
        post.position.set(axis === "x" ? fx + f * len : fx, (V.FENCE_H + 0.08) / 2, axis === "z" ? fz + f * len : fz);
        g.add(post);
      }
    }

    // round hay bales (a cylinder laid on its side) dotting the field edges.
    for (const hb of V.HAY_BALES) {
      const s = hb[2];
      const bale = meshCyl(0.22 * s, 0.22 * s, 0.4 * s, C.hay);
      bale.rotation.z = Math.PI / 2;
      bale.position.set(hb[0], 0.22 * s, hb[1]);
      g.add(bale);
    }

    // a few soft clouds (clusters of white spheres) drifting slowly across the sky.
    for (const cl of V.CLOUDS) {
      const cg = new Group();
      for (const off of [[-0.5, 0, 0, 0.5], [0.2, 0.1, 0, 0.6], [0.7, -0.05, 0.1, 0.45]]) {
        const puff = meshSphere(off[3] * cl[3], C.cloud);
        puff.position.set(off[0] * cl[3], off[1] * cl[3], off[2] * cl[3]);
        cg.add(puff);
      }
      cg.position.set(cl[0], cl[1], cl[2]);
      g.add(cg);
      clouds.push({ g: cg, baseX: cl[0], phase: cl[0] + cl[2] });
    }

    // The gentle life: canopies + distant fields drift, the windmill fan turns slowly,
    // clouds drift and loop. All slow, nothing flashes; the caller ticks on setInterval.
    function tick(clock: number) {
      const t = clock / 1000;
      for (const s of swayers) {
        s.mesh.position.x = s.baseX + Math.sin(2 * Math.PI * V.TREE_HZ * t + s.phase) * s.amp;
      }
      for (const fn of fans) {
        fn.g.rotation.z = 2 * Math.PI * V.WINDMILL_HZ * t;
      }
      for (const c of clouds) {
        const drift = ((V.CLOUD_HZ * t + c.phase) % 1) - 0.5;
        c.g.position.x = c.baseX + drift * V.CLOUD_DRIFT * 8;
      }
    }

    return { group: g, tick };
  }

  // Each stop owns a calm BACKDROP scene, registered here as { group, tick }: the
  // group shows/hides with the stop, and ONE shared loop ticks whichever stop is
  // active. Generic on purpose — adding a stop is just another registerStopScene
  // call; the loop never special-cases a stop id.
  const stopScenes: { [id: string]: Group } = {};
  const stopSceneTicks: { [id: string]: (clock: number) => void } = {};
  function registerStopScene(id: string, built: { group: Group; tick: (clock: number) => void }) {
    built.group.visible = false;
    scene.add(built.group);
    stopScenes[id] = built.group;
    stopSceneTicks[id] = built.tick;
  }
  registerStopScene("tech", buildTechStopScene());       // the Tech Office server room
  registerStopScene("tourism", buildTourismStopScene()); // the Colonial Williamsburg green
  registerStopScene("farm", buildFarmStopScene());       // the Shenandoah Valley farm

  // One shared loop gently animates whichever stop's backdrop is showing (server
  // room dots/screens, or the Tourism treeline/flag). setInterval, not rAF (rAF
  // pauses in the headset); idle on the hub, where no stop scene is shown.
  let sceneClock = 0;
  setInterval(function () {
    sceneClock += STAGING.TICK_MS;
    if (currentView === "hub") return;
    const tick = activeStopId ? stopSceneTicks[activeStopId] : null;
    if (tick) tick(sceneClock);
  }, STAGING.TICK_MS);

  function showStopScene(id: string) {
    for (const key in stopScenes) stopScenes[key].visible = key === id;
  }
  function hideAllStopScenes() {
    for (const key in stopScenes) stopScenes[key].visible = false;
  }

  // ======================================================================
  // STOP STAGING  —  the build that assembles itself as the student decides.
  // Generic by design: a stop registers a staging object; the runner calls
  // reset() at the start of a visit and addStage(decisionIndex, optionIndex,
  // reaction) after each pick. The staging owns its own Group (parented to the
  // stop's calm scene, so it shows/hides with it) and animates from ONE shared
  // setInterval (rAF pauses in the headset). Only Tech Office has one today; the
  // other lean stops can register their own the same way, so the runner shell
  // never grows a per-stop special case.
  // ======================================================================
  type StopStaging = {
    group: Group;
    reset: () => void;
    addStage: (decisionIndex: number, optionIndex: number, reaction: StageReaction) => void;
    tick: (clock: number) => void;
  };
  const stopStagings: { [id: string]: StopStaging } = {};
  type GlowRole = "building" | "power" | "runtime";
  type TourismRole = "booth" | "attraction" | "site"; // the Tourism build's three stages
  type FarmRole = "field" | "water" | "harvest";       // the Modern Farm's three stages

  // ---- Tech Office: a data center built piece by piece on the lot ahead of the
  // student. Decision 1 raises the BUILDING (with a cue for the site chosen),
  // Decision 2 adds POWER (transformer, lines, and solar panels if chosen),
  // Decision 3 adds WORKERS and the internet CABLE. Each piece then THRIVES,
  // STRUGGLES, or runs NEUTRAL based on that pick: a steady bright glow with data
  // flowing, a dim slow flicker with stalled data, or a quiet steady hum. Every
  // bit of motion is slow and gentle on purpose (kids in a headset). ----
  function buildTechStaging(): StopStaging {
    const C = TECH_BUILD.COLOR;
    const group = new Group();
    group.position.z = TECH_BUILD.FORWARD; // bring the whole construction site toward the student

    // role-tagged animated lights and cable "data" flows, all serviced by tick().
    const glowParts: { mesh: any; role: GlowRole }[] = [];
    const flows: { dots: any[]; a: number[]; b: number[]; role: GlowRole; t: number }[] = [];
    const workers: { g: Group }[] = [];
    // each stage's current reaction (null until built) and its ease-in progress.
    const reaction: { building: StageReaction | null; power: StageReaction | null; runtime: StageReaction | null } =
      { building: null, power: null, runtime: null };
    const appear = { building: 0, power: 0, runtime: 0 };

    // register a mesh as an animated light (intensity driven by its stage's reaction).
    function lit(mesh: any, color: string, role: GlowRole) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = 0;
      glowParts.push({ mesh, role });
      return mesh;
    }
    // a fixed self-lit glow that does not animate (used for static site cues).
    function glowConst(mesh: any, color: string, intensity: number) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = intensity;
      return mesh;
    }
    // a string of little lights that travel a->b along a cable and loop.
    function addFlow(parent: Group, a: number[], b: number[], role: GlowRole) {
      const dots: any[] = [];
      for (let i = 0; i < STAGING.FLOW_DOTS; i++) {
        const d = meshSphere(STAGING.FLOW_DOT_R, C.flow);
        (d.material as any).emissive = new Color(C.flow);
        (d.material as any).emissiveIntensity = 0;
        d.visible = false;
        parent.add(d);
        dots.push(d);
      }
      flows.push({ dots, a, b, role, t: 0 });
    }

    // ---- the empty lot (shown the moment you arrive, before the first pick) ----
    const lot = meshBox(TECH_BUILD.LOT_W, TECH_BUILD.LOT_THICK, TECH_BUILD.LOT_D, C.pad);
    lot.position.set(TECH_BUILD.LOT[0], TECH_BUILD.LOT[1], TECH_BUILD.LOT[2]);
    group.add(lot);
    const lotTop = TECH_BUILD.LOT[1] + TECH_BUILD.LOT_THICK / 2;
    // four legs so the lot reads as a build table standing on the floor.
    const padBottom = TECH_BUILD.LOT[1] - TECH_BUILD.LOT_THICK / 2;
    for (const lx of [-1.2, 1.2]) {
      for (const lz of [-1.0, 1.0]) {
        const leg = meshBox(0.12, padBottom, 0.12, C.line);
        leg.position.set(lx, padBottom / 2, TECH_BUILD.LOT[2] + lz);
        group.add(leg);
      }
    }
    const bx = TECH_BUILD.BLD_POS[0], bz = TECH_BUILD.BLD_POS[2];
    const bW = TECH_BUILD.BLD_W, bH = TECH_BUILD.BLD_H, bD = TECH_BUILD.BLD_D;

    // =================== STAGE 1: the building + the site cue ===================
    const buildingStage = new Group();
    buildingStage.visible = false;
    group.add(buildingStage);

    const walls = meshBox(bW, bH, bD, C.wall);
    walls.position.set(bx, lotTop + bH / 2, bz);
    buildingStage.add(walls);
    const roof = meshBox(bW + 0.04, 0.06, bD + 0.04, C.roof);
    roof.position.set(bx, lotTop + bH + 0.03, bz);
    buildingStage.add(roof);
    // a 2x3 grid of windows on the front face (+z, toward the student) — the lights.
    const frontZ = bz + bD / 2 + 0.011;
    for (const wx of [bx - 0.2, bx + 0.2]) {
      for (const wy of [lotTop + 0.22, lotTop + 0.4, lotTop + 0.58]) {
        const win = meshBox(0.16, 0.12, 0.012, C.window);
        win.position.set(wx, wy, frontZ);
        buildingStage.add(lit(win, C.window, "building"));
      }
    }

    // three swappable site cues; addStage reveals the one that matches the pick.
    const cueNoVA = new Group();
    const cueCountry = new Group();
    const cueDowntown = new Group();
    buildingStage.add(cueNoVA, cueCountry, cueDowntown);
    function siteTile(color: string) {
      const tile = meshBox(1.35, 0.02, 1.35, color);
      tile.position.set(bx, lotTop + 0.012, bz);
      return tile;
    }
    // Northern Virginia: green ground + a glowing "fast line" leading toward the net.
    cueNoVA.add(siteTile(C.grass));
    const fastLine = meshBox(0.7, 0.012, 0.08, C.flow);
    fastLine.position.set(bx - 0.78, lotTop + 0.02, bz + 0.5);
    cueNoVA.add(glowConst(fastLine, C.flow, 0.6));
    // Countryside: dry dirt + a lone tree far off, to read "out on its own".
    cueCountry.add(siteTile(C.dirt));
    const trunk = meshCyl(0.04, 0.05, 0.3, C.tree);
    trunk.position.set(0.95, lotTop + 0.15, -1.7);
    cueCountry.add(trunk);
    const leaf = meshCone(0.22, 0.42, C.leaf);
    leaf.position.set(0.95, lotTop + 0.5, -1.7);
    cueCountry.add(leaf);
    // Downtown: concrete + tall neighbors crowding the lot, no room to grow.
    cueDowntown.add(siteTile(C.concrete));
    const n1 = meshBox(0.5, 1.4, 0.5, "#7d868f");
    n1.position.set(-1.15, lotTop + 0.7, -1.5);
    cueDowntown.add(n1);
    const n2 = meshBox(0.45, 1.1, 0.45, "#8b949c");
    n2.position.set(0.55, lotTop + 0.55, -1.6);
    cueDowntown.add(n2);
    cueNoVA.visible = cueCountry.visible = cueDowntown.visible = false;

    // =============== STAGE 2: power (transformer, lines, optional solar) ========
    const powerStage = new Group();
    powerStage.visible = false;
    group.add(powerStage);
    const tx = TECH_BUILD.TRANSFORMER_POS[0], tz = TECH_BUILD.TRANSFORMER_POS[2];
    const trans = meshBox(0.3, 0.34, 0.3, C.transformer);
    trans.position.set(tx, lotTop + 0.17, tz);
    powerStage.add(trans);
    for (const ox of [-0.08, 0.08]) {
      const bush = meshCyl(0.03, 0.03, 0.1, C.bushing);
      bush.position.set(tx + ox, lotTop + 0.39, tz);
      powerStage.add(bush);
    }
    const indicator = meshBox(0.09, 0.05, 0.012, C.indicator);
    indicator.position.set(tx, lotTop + 0.2, tz + 0.151);
    powerStage.add(lit(indicator, C.indicator, "power"));
    // a pole and a line carrying power across to the building; data flows along it.
    const pole = meshCyl(0.02, 0.02, 0.7, C.pole);
    pole.position.set(tx, lotTop + 0.35, tz);
    powerStage.add(pole);
    const bRightX = bx + bW / 2;
    const lineY = lotTop + 0.66;
    const line = meshBox(tx - bRightX, 0.02, 0.02, C.line);
    line.position.set((tx + bRightX) / 2, lineY, tz);
    powerStage.add(line);
    addFlow(powerStage, [tx, lineY, tz], [bRightX, lineY, bz + bD / 2 - 0.1], "power");
    // solar panels — only when the student adds them (the "smart, modern touch").
    const solarGroup = new Group();
    powerStage.add(solarGroup);
    for (const sx of [TECH_BUILD.SOLAR_POS[0] - 0.18, TECH_BUILD.SOLAR_POS[0] + 0.2]) {
      const post = meshCyl(0.02, 0.02, 0.2, C.pole);
      post.position.set(sx, lotTop + 0.1, TECH_BUILD.SOLAR_POS[2]);
      solarGroup.add(post);
      const panel = meshBox(0.34, 0.02, 0.26, C.solar);
      panel.position.set(sx, lotTop + 0.26, TECH_BUILD.SOLAR_POS[2]);
      panel.rotation.x = -0.6;
      solarGroup.add(panel);
      const gleam = meshBox(0.3, 0.006, 0.04, C.solarGleam);
      gleam.position.set(sx, lotTop + 0.29, TECH_BUILD.SOLAR_POS[2] + 0.04);
      gleam.rotation.x = -0.6;
      solarGroup.add(lit(gleam, C.solarGleam, "power"));
    }
    solarGroup.visible = false;

    // =============== STAGE 3: workers + the internet cable ======================
    const runtimeStage = new Group();
    runtimeStage.visible = false;
    group.add(runtimeStage);
    // an internet node (a little cloud on a post) at the edge of the lot.
    const nx = TECH_BUILD.NODE_POS[0], nz = TECH_BUILD.NODE_POS[2];
    const nodePost = meshCyl(0.025, 0.025, 0.52, C.pole);
    nodePost.position.set(nx, lotTop + 0.26, nz);
    runtimeStage.add(nodePost);
    for (const puffAt of [[-0.1, 0.6, 0, 0.12], [0.08, 0.62, 0.02, 0.1], [0.0, 0.58, -0.06, 0.1]]) {
      const puff = meshSphere(puffAt[3], C.cloud);
      puff.position.set(nx + puffAt[0], lotTop + puffAt[1], nz + puffAt[2]);
      runtimeStage.add(puff);
    }
    const nodeGlow = meshSphere(0.05, C.nodeGlow);
    nodeGlow.position.set(nx, lotTop + 0.6, nz + 0.12);
    runtimeStage.add(lit(nodeGlow, C.nodeGlow, "runtime"));
    // the cable from the building to the internet, carrying data when it runs well.
    const bLeftX = bx - bW / 2;
    const cableY = lotTop + 0.5;
    const cable = meshBox(bLeftX - nx, 0.018, 0.018, C.line);
    cable.position.set((bLeftX + nx) / 2, cableY, nz);
    runtimeStage.add(cable);
    addFlow(runtimeStage, [bLeftX, cableY, bz], [nx, cableY, nz], "runtime");
    // up to three workers in front (one only, when run with as few people as possible).
    for (const spot of [[-0.75, -0.3], [-0.4, -0.12], [-0.05, -0.32]]) {
      const wg = new Group();
      const body = meshCyl(0.05, 0.06, 0.14, C.vest);
      body.position.set(spot[0], lotTop + 0.07, spot[1]);
      wg.add(body);
      const head = meshSphere(0.045, C.helmet);
      head.position.set(spot[0], lotTop + 0.18, spot[1]);
      wg.add(head);
      runtimeStage.add(wg);
      workers.push({ g: wg });
    }

    const stages: GlowRole[] = ["building", "power", "runtime"];
    const stageGroup: { [k in GlowRole]: Group } = { building: buildingStage, power: powerStage, runtime: runtimeStage };

    // a slow, uneven 0..1 wave for the "struggling" look — gentle, never a strobe.
    function flicker(t: number) {
      const w = 0.6 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_A * t)
              + 0.4 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_B * t + 1.3);
      return 0.5 + 0.5 * w;
    }

    // ---- the three calls the runner drives ----
    function reset() {
      reaction.building = reaction.power = reaction.runtime = null;
      appear.building = appear.power = appear.runtime = 0;
      buildingStage.visible = powerStage.visible = runtimeStage.visible = false;
      buildingStage.position.y = powerStage.position.y = runtimeStage.position.y = 0;
      cueNoVA.visible = cueCountry.visible = cueDowntown.visible = false;
      solarGroup.visible = false;
      for (const w of workers) w.g.visible = false;
      for (const gp of glowParts) gp.mesh.material.emissiveIntensity = 0;
      for (const fl of flows) { fl.t = 0; for (const d of fl.dots) d.visible = false; }
    }

    function addStage(i: number, optionIndex: number, r: StageReaction) {
      if (i === 0) {
        cueNoVA.visible = optionIndex === 1;     // option 1 = Northern Virginia
        cueCountry.visible = optionIndex === 0;  // option 0 = countryside
        cueDowntown.visible = optionIndex === 2; // option 2 = downtown
        reaction.building = r; appear.building = 0; buildingStage.visible = true;
      } else if (i === 1) {
        solarGroup.visible = optionIndex === 1;  // option 1 = reliable supply + solar
        reaction.power = r; appear.power = 0; powerStage.visible = true;
      } else if (i === 2) {
        const few = optionIndex === 1;           // option 1 = as few people as possible
        for (let k = 0; k < workers.length; k++) workers[k].g.visible = few ? k === 0 : true;
        reaction.runtime = r; appear.runtime = 0; runtimeStage.visible = true;
      }
    }

    function tick(clock: number) {
      const t = clock / 1000;
      // ease each freshly-added stage up into place (a gentle rise, no pop).
      for (const key of stages) {
        if (reaction[key] && appear[key] < 1) {
          appear[key] = Math.min(1, appear[key] + STAGING.TICK_MS / STAGING.APPEAR_MS);
        }
        const e = 1 - (1 - appear[key]) * (1 - appear[key]); // ease-out
        stageGroup[key].position.y = (1 - e) * -STAGING.APPEAR_RISE;
      }
      // drive each role-tagged light to match its stage's reaction.
      for (const gp of glowParts) {
        const r = reaction[gp.role];
        if (!r) continue;
        let v: number;
        if (r === "thrive") v = STAGING.THRIVE_GLOW + STAGING.THRIVE_PULSE_AMP * Math.sin(2 * Math.PI * STAGING.THRIVE_PULSE_HZ * t);
        else if (r === "neutral") v = STAGING.NEUTRAL_GLOW;
        else v = STAGING.STRUGGLE_GLOW_MIN + (STAGING.STRUGGLE_GLOW_MAX - STAGING.STRUGGLE_GLOW_MIN) * flicker(t);
        gp.mesh.material.emissiveIntensity = v * appear[gp.role];
      }
      // run the data flows: smooth when thriving, a trickle when neutral, a crawl
      // (that stalls on the flicker low points) when struggling.
      for (const fl of flows) {
        const r = reaction[fl.role];
        if (!r) { for (const d of fl.dots) d.visible = false; continue; }
        let speed: number, glow: number;
        if (r === "thrive") { speed = STAGING.FLOW_SPEED_THRIVE; glow = STAGING.FLOW_GLOW_THRIVE; }
        else if (r === "neutral") { speed = STAGING.FLOW_SPEED_NEUTRAL; glow = STAGING.FLOW_GLOW_NEUTRAL; }
        else { speed = STAGING.FLOW_SPEED_STRUGGLE * (0.2 + 0.8 * flicker(t)); glow = STAGING.FLOW_GLOW_STRUGGLE; }
        fl.t = (fl.t + speed * (STAGING.TICK_MS / 1000)) % 1;
        const a = fl.a, b = fl.b;
        const vis = appear[fl.role] > 0.2;
        for (let i = 0; i < fl.dots.length; i++) {
          const d = fl.dots[i];
          const f = (fl.t + i / fl.dots.length) % 1;
          d.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
          d.visible = vis;
          (d.material as any).emissiveIntensity = glow * appear[fl.role];
        }
      }
      // a tiny idle bob for the workers when the center is thriving (they're busy).
      const lively = reaction.runtime === "thrive";
      for (let i = 0; i < workers.length; i++) {
        workers[i].g.position.y = lively
          ? Math.abs(Math.sin(2 * Math.PI * STAGING.WORKER_BOB_HZ * t + i)) * STAGING.WORKER_BOB_AMP
          : 0;
      }
    }

    reset();
    return { group, reset, addStage, tick };
  }

  // ---- Tourism Hub: a Colonial Williamsburg village built up choice by choice on
  // the green ahead of the student. The site (a green with two brick buildings) is
  // there from arrival. Decision 1 (pricing) raises the TICKET BOOTH and an arriving
  // crowd sized by the price; Decision 2 (draw) reveals the ATTRACTION (real exhibits,
  // gaudy fakes, or almost nothing) with more or fewer visitors; Decision 3 (crowds vs
  // buildings) sets the SITE's condition (a clean gleam, worn patches, or closed-off
  // ropes) and the final crowd. Each stage then THRIVES (warm steady glow), STRUGGLES
  // (dim uneven flicker), or runs NEUTRAL (a quiet mid glow). Same { group, reset,
  // addStage, tick } contract Tech uses, so the runner drives it unchanged. All motion
  // stays slow and gentle (kids in a headset). ----
  function buildTourismStaging(): StopStaging {
    const T = TOURISM_BUILD;
    const C = T.COLOR;
    const group = new Group();
    group.position.z = T.FORWARD; // bring the village toward the student

    // role-tagged animated lights (intensity follows each stage's reaction).
    const glowParts: { mesh: any; role: TourismRole }[] = [];
    const visitorPalette = [C.visitor, C.visitorAlt, C.visitorAlt2];
    // each stage's reaction (null until built) + its ease-in progress.
    const reaction: { booth: StageReaction | null; attraction: StageReaction | null; site: StageReaction | null } =
      { booth: null, attraction: null, site: null };
    const appear = { booth: 0, attraction: 0, site: 0 };

    // register a mesh as an animated light (driven by its stage's reaction).
    function lit(mesh: any, color: string, role: TourismRole) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = 0;
      glowParts.push({ mesh, role });
      return mesh;
    }

    // ---- the green (a raised table) + the colonial buildings already standing ----
    const green = meshBox(T.GREEN_W, T.GREEN_THICK, T.GREEN_D, C.green);
    green.position.set(T.GREEN[0], T.GREEN[1], T.GREEN[2]);
    group.add(green);
    const greenTop = T.GREEN[1] + T.GREEN_THICK / 2;
    const greenBottom = T.GREEN[1] - T.GREEN_THICK / 2;
    for (const lx of [-1.2, 1.2]) {
      for (const lz of [-1.0, 1.0]) {
        const leg = meshBox(0.12, greenBottom, 0.12, C.post);
        leg.position.set(lx, greenBottom / 2, T.GREEN[2] + lz);
        group.add(leg);
      }
    }
    // a sandy path across the green so it reads as a walkable village.
    const path = meshBox(0.55, 0.012, T.GREEN_D * 0.85, C.path);
    path.position.set(0.15, greenTop + 0.008, T.GREEN[2]);
    group.add(path);

    // a colonial building: brick block + wood roof + white trim + warm windows.
    // The windows are role "site", so they light up with the final-condition pick.
    function colonialBuilding(pos: [number, number, number], w: number, h: number, d: number, cupola: boolean) {
      const cx = pos[0], cz = pos[2];
      const body = meshBox(w, h, d, C.brick);
      body.position.set(cx, greenTop + h / 2, cz);
      group.add(body);
      const roof = meshBox(w + 0.06, 0.06, d + 0.06, C.roof);
      roof.position.set(cx, greenTop + h + 0.03, cz);
      group.add(roof);
      const fz = cz + d / 2 + 0.012;
      const trim = meshBox(w, 0.05, 0.02, C.trim);
      trim.position.set(cx, greenTop + 0.05, fz);
      group.add(trim);
      for (const wx of [cx - w * 0.25, cx + w * 0.25]) {
        const win = meshBox(0.12, 0.16, 0.012, C.window);
        win.position.set(wx, greenTop + h * 0.5, fz);
        group.add(lit(win, C.window, "site"));
      }
      if (cupola) {
        const base = meshBox(0.18, 0.12, 0.18, C.cupola);
        base.position.set(cx, greenTop + h + 0.1, cz);
        group.add(base);
        const spire = meshCone(0.06, 0.18, C.spire);
        spire.position.set(cx, greenTop + h + 0.27, cz);
        group.add(spire);
      }
      return { cx, cz, fz, w, h };
    }
    const hall = colonialBuilding(T.HALL_POS, T.HALL_W, T.HALL_H, T.HALL_D, true);
    const house = colonialBuilding(T.HOUSE_POS, T.HOUSE_W, T.HOUSE_H, T.HOUSE_D, false);

    // a calm visitor figure (body + head) parented to a Group we can bob/sway.
    function makeVisitor(parent: Group, x: number, z: number, color: string) {
      const vg = new Group();
      const body = meshCyl(0.05, 0.07, 0.16, color);
      body.position.set(x, greenTop + 0.08, z);
      vg.add(body);
      const head = meshSphere(0.045, C.head);
      head.position.set(x, greenTop + 0.2, z);
      vg.add(head);
      parent.add(vg);
      return vg;
    }
    // a crowd pool of `max` visitors in a loose cluster; deterministic spots (no rng).
    function makeCrowd(parent: Group, anchor: [number, number, number], max: number) {
      const spots = [
        [0.0, 0.0], [0.24, 0.13], [-0.22, 0.1], [0.13, -0.18], [-0.18, -0.15],
        [0.36, -0.05], [-0.36, -0.02], [0.05, 0.26],
      ];
      const list: { g: Group; phase: number }[] = [];
      for (let i = 0; i < max; i++) {
        const s = spots[i % spots.length];
        const v = makeVisitor(parent, anchor[0] + s[0], anchor[2] + s[1], visitorPalette[i % visitorPalette.length]);
        v.visible = false;
        list.push({ g: v, phase: i * 1.3 });
      }
      return list;
    }

    // =================== STAGE 1: ticket booth + arriving crowd ===================
    const boothStage = new Group();
    boothStage.visible = false;
    group.add(boothStage);
    {
      const bx = T.BOOTH_POS[0], bz = T.BOOTH_POS[2];
      const booth = meshBox(0.34, 0.4, 0.3, C.boothWood);
      booth.position.set(bx, greenTop + 0.2, bz);
      boothStage.add(booth);
      const counter = meshBox(0.38, 0.05, 0.14, C.trim);
      counter.position.set(bx, greenTop + 0.3, bz + 0.18);
      boothStage.add(counter);
      const roof = meshCone(0.34, 0.18, C.boothRoof);
      roof.position.set(bx, greenTop + 0.49, bz);
      roof.rotation.y = Math.PI / 4;
      boothStage.add(roof);
      // the booth lantern + sign: the lit parts that react to the pricing pick.
      const lantern = meshSphere(0.05, C.lantern);
      lantern.position.set(bx + 0.16, greenTop + 0.42, bz + 0.14);
      boothStage.add(lit(lantern, C.lantern, "booth"));
      const sign = meshBox(0.26, 0.12, 0.02, C.lantern);
      sign.position.set(bx, greenTop + 0.52, bz + 0.16);
      boothStage.add(lit(sign, C.lantern, "booth"));
    }
    const crowdBooth = makeCrowd(boothStage, T.CROWD_BOOTH_AT, Math.max(...T.CROWD_BOOTH_N));

    // =================== STAGE 2: the attraction (3 swappable cues) ===============
    const attractStage = new Group();
    attractStage.visible = false;
    group.add(attractStage);
    const ax = T.ATTRACT_POS[0], az = T.ATTRACT_POS[2];
    // cue A: authentic colonial history — a craft table, barrels, a colonial banner.
    const cueAuthentic = new Group();
    attractStage.add(cueAuthentic);
    {
      const table = meshBox(0.5, 0.06, 0.3, C.exhibit);
      table.position.set(ax, greenTop + 0.18, az);
      cueAuthentic.add(table);
      for (const lx of [-0.2, 0.2]) for (const lz of [-0.1, 0.1]) {
        const leg = meshBox(0.04, 0.18, 0.04, C.barrel);
        leg.position.set(ax + lx, greenTop + 0.09, az + lz);
        cueAuthentic.add(leg);
      }
      for (const bx2 of [-0.34, 0.34]) {
        const barrel = meshCyl(0.08, 0.08, 0.18, C.barrel);
        barrel.position.set(ax + bx2, greenTop + 0.09, az - 0.04);
        cueAuthentic.add(barrel);
      }
      const bpole = meshCyl(0.02, 0.02, 0.6, C.signPost);
      bpole.position.set(ax + 0.12, greenTop + 0.3, az + 0.16);
      cueAuthentic.add(bpole);
      const banner = meshBox(0.02, 0.24, 0.3, C.banner);
      banner.position.set(ax + 0.13, greenTop + 0.46, az + 0.31);
      cueAuthentic.add(lit(banner, C.banner, "attraction"));
      const lamp = meshSphere(0.045, C.lantern);
      lamp.position.set(ax - 0.12, greenTop + 0.4, az + 0.16);
      cueAuthentic.add(lit(lamp, C.lantern, "attraction"));
    }
    // cue B: flashy fake — a gaudy oversized arch in clashing neon colors.
    const cueFlashy = new Group();
    attractStage.add(cueFlashy);
    {
      for (const sx of [-0.3, 0.3]) {
        const leg = meshBox(0.1, 0.7, 0.1, sx < 0 ? C.gaudy1 : C.gaudy2);
        leg.position.set(ax + sx, greenTop + 0.35, az);
        cueFlashy.add(lit(leg, sx < 0 ? C.gaudy1 : C.gaudy2, "attraction"));
      }
      const top = meshBox(0.82, 0.12, 0.12, C.gaudy3);
      top.position.set(ax, greenTop + 0.74, az);
      cueFlashy.add(lit(top, C.gaudy3, "attraction"));
      const blob = meshSphere(0.14, C.gaudy1);
      blob.position.set(ax, greenTop + 0.92, az);
      cueFlashy.add(lit(blob, C.gaudy1, "attraction"));
    }
    // cue C: do nothing — a lone empty signpost, almost nothing to see.
    const cueNothing = new Group();
    attractStage.add(cueNothing);
    {
      const post = meshCyl(0.025, 0.025, 0.5, C.signPost);
      post.position.set(ax, greenTop + 0.25, az);
      cueNothing.add(post);
      const board = meshBox(0.28, 0.16, 0.02, C.signPost);
      board.position.set(ax, greenTop + 0.5, az);
      cueNothing.add(board);
    }
    cueAuthentic.visible = cueFlashy.visible = cueNothing.visible = false;
    const crowdAttract = makeCrowd(attractStage, T.CROWD_ATTRACT_AT, Math.max(...T.CROWD_ATTRACT_N));

    // =================== STAGE 3: the site's condition (3 swappable cues) =========
    const siteStage = new Group();
    siteStage.visible = false;
    group.add(siteStage);
    // cue: smart limits — fresh and well-kept (a clean gleam + tidy flower boxes).
    const cueClean = new Group();
    siteStage.add(cueClean);
    for (const b of [hall, house]) {
      const gleam = meshBox(b.w * 0.9, 0.04, 0.02, C.cleanGleam);
      gleam.position.set(b.cx, greenTop + b.h - 0.02, b.fz);
      cueClean.add(lit(gleam, C.cleanGleam, "site"));
      const box = meshBox(b.w * 0.7, 0.05, 0.06, C.spire);
      box.position.set(b.cx, greenTop + b.h * 0.32, b.fz + 0.02);
      cueClean.add(box);
    }
    // cue: huge crowds — worn, dingy patches across the building fronts.
    const cueWorn = new Group();
    siteStage.add(cueWorn);
    for (const b of [hall, house]) {
      for (const p of [[-0.22, 0.55], [0.2, 0.32], [0.0, 0.72]]) {
        const patch = meshBox(0.14, 0.12, 0.012, C.worn);
        patch.position.set(b.cx + p[0] * b.w, greenTop + b.h * p[1], b.fz + 0.003);
        cueWorn.add(patch);
      }
    }
    // cue: close off — ropes on posts across the front, the site mostly shut.
    const cueClosed = new Group();
    siteStage.add(cueClosed);
    {
      const frontZ = T.GREEN[2] + 0.35;
      for (const px of [-0.8, -0.27, 0.27, 0.8]) {
        const rpost = meshCyl(0.02, 0.02, 0.3, C.post);
        rpost.position.set(px, greenTop + 0.15, frontZ);
        cueClosed.add(rpost);
      }
      for (const seg of [[-0.8, -0.27], [-0.27, 0.27], [0.27, 0.8]]) {
        const rope = meshBox(seg[1] - seg[0], 0.02, 0.02, C.rope);
        rope.position.set((seg[0] + seg[1]) / 2, greenTop + 0.26, frontZ);
        cueClosed.add(lit(rope, C.rope, "site"));
      }
    }
    cueClean.visible = cueWorn.visible = cueClosed.visible = false;
    const crowdSite = makeCrowd(siteStage, T.CROWD_SITE_AT, Math.max(...T.CROWD_SITE_N));

    const stages: TourismRole[] = ["booth", "attraction", "site"];
    const stageGroup: { [k in TourismRole]: Group } = { booth: boothStage, attraction: attractStage, site: siteStage };
    const crowds: { [k in TourismRole]: { g: Group; phase: number }[] } = { booth: crowdBooth, attraction: crowdAttract, site: crowdSite };

    // a slow, uneven 0..1 wave for the "struggling/troubled" look — never a strobe.
    function flicker(t: number) {
      const w = 0.6 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_A * t)
              + 0.4 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_B * t + 1.3);
      return 0.5 + 0.5 * w;
    }
    function setCrowdCount(list: { g: Group; phase: number }[], n: number) {
      for (let i = 0; i < list.length; i++) list[i].g.visible = i < n;
    }

    // ---- the three calls the runner drives ----
    function reset() {
      reaction.booth = reaction.attraction = reaction.site = null;
      appear.booth = appear.attraction = appear.site = 0;
      boothStage.visible = attractStage.visible = siteStage.visible = false;
      boothStage.position.y = attractStage.position.y = siteStage.position.y = 0;
      cueAuthentic.visible = cueFlashy.visible = cueNothing.visible = false;
      cueClean.visible = cueWorn.visible = cueClosed.visible = false;
      for (const c of [crowdBooth, crowdAttract, crowdSite]) for (const v of c) v.g.visible = false;
      for (const gp of glowParts) gp.mesh.material.emissiveIntensity = 0;
    }

    function addStage(i: number, optionIndex: number, r: StageReaction) {
      if (i === 0) {
        setCrowdCount(crowdBooth, T.CROWD_BOOTH_N[optionIndex] || 0); // free=large, fair=healthy, high=sparse
        reaction.booth = r; appear.booth = 0; boothStage.visible = true;
      } else if (i === 1) {
        cueNothing.visible = optionIndex === 0;   // option 0 = do nothing
        cueAuthentic.visible = optionIndex === 1; // option 1 = real history
        cueFlashy.visible = optionIndex === 2;    // option 2 = flashy fake
        setCrowdCount(crowdAttract, T.CROWD_ATTRACT_N[optionIndex] || 0);
        reaction.attraction = r; appear.attraction = 0; attractStage.visible = true;
      } else if (i === 2) {
        cueWorn.visible = optionIndex === 0;      // option 0 = huge crowds (worn)
        cueClean.visible = optionIndex === 1;     // option 1 = smart limits (clean)
        cueClosed.visible = optionIndex === 2;    // option 2 = close off (shut)
        setCrowdCount(crowdSite, T.CROWD_SITE_N[optionIndex] || 0);
        reaction.site = r; appear.site = 0; siteStage.visible = true;
      }
    }

    // gently bob + sway each visible visitor (slow and calm; a thriving crowd is a
    // touch livelier). Never fast, never flashing.
    function bobCrowd(role: TourismRole, t: number) {
      const r = reaction[role];
      const amp = r === "thrive" ? STAGING.WORKER_BOB_AMP * 1.5 : STAGING.WORKER_BOB_AMP;
      for (const v of crowds[role]) {
        if (!v.g.visible) continue;
        v.g.position.y = Math.abs(Math.sin(2 * Math.PI * STAGING.WORKER_BOB_HZ * t + v.phase)) * amp;
        v.g.position.x = Math.sin(2 * Math.PI * STAGING.WORKER_BOB_HZ * 0.5 * t + v.phase) * 0.02;
      }
    }

    function tick(clock: number) {
      const t = clock / 1000;
      // ease each freshly-added stage up into place (a gentle rise, no pop).
      for (const key of stages) {
        if (reaction[key] && appear[key] < 1) {
          appear[key] = Math.min(1, appear[key] + STAGING.TICK_MS / STAGING.APPEAR_MS);
        }
        const e = 1 - (1 - appear[key]) * (1 - appear[key]); // ease-out
        stageGroup[key].position.y = (1 - e) * -STAGING.APPEAR_RISE;
      }
      // drive each role-tagged light to match its stage's reaction.
      for (const gp of glowParts) {
        const r = reaction[gp.role];
        if (!r) continue;
        let v: number;
        if (r === "thrive") v = STAGING.THRIVE_GLOW + STAGING.THRIVE_PULSE_AMP * Math.sin(2 * Math.PI * STAGING.THRIVE_PULSE_HZ * t);
        else if (r === "neutral") v = STAGING.NEUTRAL_GLOW;
        else v = STAGING.STRUGGLE_GLOW_MIN + (STAGING.STRUGGLE_GLOW_MAX - STAGING.STRUGGLE_GLOW_MIN) * flicker(t);
        gp.mesh.material.emissiveIntensity = v * appear[gp.role];
      }
      // calm visitors: a slow bob + a gentle sway on whoever is present.
      bobCrowd("booth", t);
      bobCrowd("attraction", t);
      bobCrowd("site", t);
    }

    reset();
    return { group, reset, addStage, tick };
  }

  // ---- Modern Farm: a field built up choice by choice on the plot ahead of the
  // student. The tilled, empty plot is there from arrival. Decision 1 (planting)
  // PLANTS the field — neat green rows, a patchy uneven field, or overcrowded clumps.
  // Decision 2 (watering) adds the WATERING tech and the field responds — a sensor
  // drone sweeps over and greens the dry spots, sprinklers leave wasteful puddles, or
  // the crops droop from waiting too long. Decision 3 (harvest) shows the PAYOFF — a
  // harvester with a full crop and trucks to market, a small local stand, or a bruised
  // low-quality haul. Each stage then THRIVES (lush steady glow), STRUGGLES (dim uneven
  // flicker), or runs NEUTRAL (a quiet mid glow). Same { group, reset, addStage, tick }
  // contract Tech and Tourism use, so the runner drives it unchanged. All motion stays
  // slow and gentle (kids in a headset). ----
  function buildFarmStaging(): StopStaging {
    const F = FARM_BUILD;
    const C = F.COLOR;
    const group = new Group();
    group.position.z = F.FORWARD; // bring the field toward the student

    // role-tagged animated lights (intensity follows each stage's reaction).
    const glowParts: { mesh: any; role: FarmRole }[] = [];
    // each stage's reaction (null until built) + its ease-in progress.
    const reaction: { field: StageReaction | null; water: StageReaction | null; harvest: StageReaction | null } =
      { field: null, water: null, harvest: null };
    const appear = { field: 0, water: 0, harvest: 0 };
    let droneActive = false; // true only for the drone watering pick (it sweeps in tick)

    // register a mesh as an animated light (driven by its stage's reaction).
    function lit(mesh: any, color: string, role: FarmRole) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = 0;
      glowParts.push({ mesh, role });
      return mesh;
    }

    // ---- the plot (a raised table) + the tilled soil bed, both there from arrival ----
    const plot = meshBox(F.PLOT_W, F.PLOT_THICK, F.PLOT_D, C.plot);
    plot.position.set(F.PLOT[0], F.PLOT[1], F.PLOT[2]);
    group.add(plot);
    const plotTop = F.PLOT[1] + F.PLOT_THICK / 2;
    const plotBottom = F.PLOT[1] - F.PLOT_THICK / 2;
    for (const lx of [-1.2, 1.2]) {
      for (const lz of [-1.0, 1.0]) {
        const leg = meshBox(0.12, plotBottom, 0.12, C.plot);
        leg.position.set(lx, plotBottom / 2, F.PLOT[2] + lz);
        group.add(leg);
      }
    }
    const soil = meshBox(F.SOIL_W, F.SOIL_THICK, F.SOIL_D, C.soil);
    soil.position.set(0, plotTop + F.SOIL_THICK / 2, F.SOIL_Z);
    group.add(soil);
    const soilTop = plotTop + F.SOIL_THICK;
    // furrow lines across the soil, so the empty bed already reads as "tilled and ready".
    for (let r = 0; r < F.ROWS; r++) {
      const fz = F.ROW_Z0 + r * F.ROW_DZ;
      const furrow = meshBox(F.SOIL_W * 0.92, 0.012, 0.04, "#4a3420");
      furrow.position.set(0, soilTop + 0.006, fz);
      group.add(furrow);
    }

    const clumpX = (col: number) => F.COL_X0 + col * F.COL_DX;
    const clumpZ = (row: number) => F.ROW_Z0 + row * F.ROW_DZ;
    // a single plant: a short stem + a leafy top (the lit part, so it reacts). A tilt
    // leans it over for the drooping/wilted look.
    function plant(parent: Group, x: number, z: number, h: number, topColor: string, role: FarmRole, tilt = 0) {
      const stemH = h * 0.5;
      const stem = meshCyl(0.012, 0.018, stemH, C.stem);
      stem.position.set(x, soilTop + stemH / 2, z);
      stem.rotation.z = tilt;
      parent.add(stem);
      const topH = h * 0.62;
      const top = meshCone(0.07, topH, topColor);
      top.position.set(x + Math.sin(tilt) * h * 0.4, soilTop + stemH + topH / 2 - 0.02, z);
      top.rotation.z = tilt;
      parent.add(lit(top, topColor, role));
    }

    // =================== STAGE 1: the planted field (3 swappable cues) ============
    const fieldStage = new Group();
    fieldStage.visible = false;
    group.add(fieldStage);
    // cue: GPS tractor — a full, tidy grid of even, healthy rows.
    const cueRows = new Group();
    fieldStage.add(cueRows);
    for (let r = 0; r < F.ROWS; r++) {
      for (let col = 0; col < F.PER_ROW; col++) {
        plant(cueRows, clumpX(col), clumpZ(r), F.PLANT_H, C.crop, "field");
      }
    }
    // cue: by hand — the same field but patchy: gaps, jitter, and uneven heights.
    const cueHand = new Group();
    fieldStage.add(cueHand);
    for (let r = 0; r < F.ROWS; r++) {
      for (let col = 0; col < F.PER_ROW; col++) {
        if ((col * 2 + r) % 3 === 0) continue; // ~a third of the spots come up empty
        const dx = (((col * 7 + r * 3) % 5) - 2) * 0.03;
        const dz = (((col * 3 + r * 5) % 5) - 2) * 0.03;
        const hh = F.PLANT_H * (0.65 + ((col + r) % 3) * 0.2);
        plant(cueHand, clumpX(col) + dx, clumpZ(r) + dz, hh, C.crop, "field");
      }
    }
    // cue: too many seeds — a dense, packed grid (half spacing) of choked, yellowed plants.
    const cueCrowded = new Group();
    fieldStage.add(cueCrowded);
    for (let r = 0; r < F.ROWS; r++) {
      for (let col = 0; col < F.PER_ROW * 2 - 1; col++) {
        const x = F.COL_X0 + col * (F.COL_DX / 2);
        const hh = F.PLANT_H * (0.7 + ((col * 3 + r) % 3) * 0.12);
        plant(cueCrowded, x, clumpZ(r), hh, C.cropChoke, "field");
      }
    }
    cueRows.visible = cueHand.visible = cueCrowded.visible = false;

    // =================== STAGE 2: the watering tech (3 swappable cues) ============
    const waterStage = new Group();
    waterStage.visible = false;
    group.add(waterStage);
    // cue: sensor drone — a quadcopter that hovers and sweeps, greening the dry spots.
    const cueDrone = new Group();
    waterStage.add(cueDrone);
    const droneGroup = new Group();
    const droneBaseX = 0;
    const droneZ = F.SOIL_Z;
    {
      const body = meshBox(0.18, 0.06, 0.18, C.drone);
      droneGroup.add(body);
      for (const [ax, az] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]] as [number, number][]) {
        const arm = meshBox(0.04, 0.02, 0.04, C.droneTrim);
        arm.position.set(ax, 0.02, az);
        droneGroup.add(arm);
        const rotor = meshCyl(0.06, 0.06, 0.012, C.droneTrim);
        rotor.position.set(ax, 0.05, az);
        droneGroup.add(rotor);
      }
      const eye = meshSphere(0.035, C.sensor);
      eye.position.set(0, -0.04, 0);
      droneGroup.add(lit(eye, C.sensor, "water"));
      const beam = meshCone(0.07, 0.3, C.sensor);
      beam.rotation.x = Math.PI; // point the scanning beam straight down at the field
      beam.position.set(0, -0.2, 0);
      droneGroup.add(lit(beam, C.sensor, "water"));
    }
    droneGroup.position.set(droneBaseX, soilTop + F.DRONE_HOVER_Y, droneZ);
    cueDrone.add(droneGroup);
    // the freshly-greened dry spots the drone found: small bright disks on the soil.
    for (const sp of [[-0.7, -1.3], [0.5, -1.45], [-0.2, -0.7], [0.8, -0.9], [-0.9, -0.6]]) {
      const patch = meshCyl(0.13, 0.13, 0.014, C.greened);
      patch.position.set(sp[0], soilTop + 0.012, sp[1]);
      cueDrone.add(lit(patch, C.greened, "water"));
    }
    // cue: water the whole field — sprinklers with wasteful standing puddles.
    const cueSprinklers = new Group();
    waterStage.add(cueSprinklers);
    for (const px of [-0.7, 0, 0.7]) {
      const post = meshCyl(0.018, 0.018, 0.28, C.sprinkler);
      post.position.set(px, soilTop + 0.14, -0.9);
      cueSprinklers.add(post);
      const head = meshSphere(0.04, C.sprinkler);
      head.position.set(px, soilTop + 0.29, -0.9);
      cueSprinklers.add(head);
    }
    for (const pd of [[-0.6, -1.2, 0.2], [0.4, -1.4, 0.26], [-0.1, -0.7, 0.3], [0.7, -0.9, 0.22], [0.0, -1.6, 0.24]]) {
      const puddle = meshCyl(pd[2], pd[2], 0.012, C.puddle);
      puddle.position.set(pd[0], soilTop + 0.01, pd[1]);
      cueSprinklers.add(lit(puddle, C.puddle, "water"));
    }
    // cue: wait until they wilt — a scatter of drooping, sickly plants.
    const cueWilt = new Group();
    waterStage.add(cueWilt);
    for (const wp of [[-0.7, -1.3], [0.2, -1.5], [0.6, -1.0], [-0.3, -0.8], [0.9, -1.4], [-0.9, -1.0]]) {
      plant(cueWilt, wp[0], wp[1], F.PLANT_H * 0.95, C.wilt, "water", 0.6);
    }
    cueDrone.visible = cueSprinklers.visible = cueWilt.visible = false;

    // =================== STAGE 3: the harvest payoff (3 swappable cues) ===========
    const harvestStage = new Group();
    harvestStage.visible = false;
    group.add(harvestStage);
    const hz = F.HARVEST_Z;
    function wheel(parent: Group, x: number, z: number, r: number) {
      const w = meshCyl(r, r, 0.06, C.wheel);
      w.rotation.z = Math.PI / 2; // lay the wheel on its side (axis along x)
      w.position.set(x, soilTop + r, z);
      parent.add(w);
    }
    function produceHeap(parent: Group, cx: number, cz: number, color: string, role: FarmRole) {
      for (const o of [[0, 0.07, 0], [0.1, 0.06, 0.05], [-0.1, 0.06, -0.04], [0.05, 0.13, -0.02], [-0.06, 0.12, 0.06], [0, 0.18, 0.0]]) {
        const ball = meshSphere(0.06, color);
        ball.position.set(cx + o[0], soilTop + o[1], cz + o[2]);
        parent.add(lit(ball, color, role));
      }
    }
    // cue: modern machines — a harvester, a full golden crop, and trucks to market.
    const cueMachines = new Group();
    harvestStage.add(cueMachines);
    {
      // the harvester, parked at the field's left, header toward the rows.
      const hx = -0.85;
      const body = meshBox(0.46, 0.26, 0.36, C.harvester);
      body.position.set(hx, soilTop + 0.07 + 0.13, hz - 0.1);
      cueMachines.add(body);
      const cab = meshBox(0.22, 0.2, 0.24, C.cab);
      cab.position.set(hx, soilTop + 0.07 + 0.36, hz - 0.16);
      cueMachines.add(cab);
      const header = meshBox(0.6, 0.12, 0.14, C.harvesterTrim);
      header.position.set(hx, soilTop + 0.1, hz - 0.32);
      cueMachines.add(header);
      wheel(cueMachines, hx - 0.2, hz + 0.04, 0.09);
      wheel(cueMachines, hx + 0.2, hz + 0.04, 0.09);
      wheel(cueMachines, hx - 0.2, hz - 0.22, 0.07);
      wheel(cueMachines, hx + 0.2, hz - 0.22, 0.07);
      produceHeap(cueMachines, hx + 0.05, hz + 0.18, C.produce, "harvest"); // the full crop beside it
      // two market trucks lined up heading toward the student (toward "market", +z).
      for (const tx of [0.55, 1.0]) {
        const tz = hz + 0.2;
        const bed = meshBox(0.32, 0.14, 0.46, C.truckBed);
        bed.position.set(tx, soilTop + 0.07 + 0.07, tz);
        cueMachines.add(bed);
        const tcab = meshBox(0.3, 0.18, 0.2, C.truck);
        tcab.position.set(tx, soilTop + 0.07 + 0.13, tz + 0.32);
        cueMachines.add(tcab);
        const headlight = meshBox(0.22, 0.05, 0.02, C.headlight);
        headlight.position.set(tx, soilTop + 0.07 + 0.08, tz + 0.43);
        cueMachines.add(lit(headlight, C.headlight, "harvest"));
        produceHeap(cueMachines, tx, tz - 0.02, C.produce, "harvest"); // loaded with the harvest
        wheel(cueMachines, tx - 0.16, tz - 0.12, 0.07);
        wheel(cueMachines, tx + 0.16, tz - 0.12, 0.07);
        wheel(cueMachines, tx - 0.16, tz + 0.2, 0.07);
        wheel(cueMachines, tx + 0.16, tz + 0.2, 0.07);
      }
    }
    // cue: by hand to the local stand — a small wooden stand with a little produce.
    const cueStand = new Group();
    harvestStage.add(cueStand);
    {
      const sx = 0.1;
      const counter = meshBox(0.6, 0.1, 0.3, C.stand);
      counter.position.set(sx, soilTop + 0.28, hz + 0.1);
      cueStand.add(counter);
      for (const lx of [-0.26, 0.26]) {
        const leg = meshBox(0.05, 0.28, 0.05, C.stand);
        leg.position.set(sx + lx, soilTop + 0.14, hz + 0.1);
        cueStand.add(leg);
      }
      const roof = meshBox(0.72, 0.05, 0.36, C.standRoof);
      roof.position.set(sx, soilTop + 0.52, hz + 0.06);
      roof.rotation.x = -0.12;
      cueStand.add(roof);
      const sign = meshBox(0.34, 0.14, 0.02, C.standSign);
      sign.position.set(sx, soilTop + 0.46, hz + 0.27);
      cueStand.add(lit(sign, C.standSign, "harvest"));
      // a small basket of produce on the counter.
      produceHeap(cueStand, sx, hz + 0.1, C.produce, "harvest");
    }
    // cue: rush the harvest — a tipped crate and a small pile of dull, bruised produce.
    const cueRush = new Group();
    harvestStage.add(cueRush);
    {
      const rx = 0.1;
      const crate = meshBox(0.34, 0.22, 0.26, C.crate);
      crate.position.set(rx - 0.2, soilTop + 0.08, hz + 0.1);
      crate.rotation.z = 0.5; // knocked over
      cueRush.add(crate);
      // a small, low heap of bruised produce spilled out.
      for (const o of [[0, 0.05, 0], [0.12, 0.05, 0.05], [0.2, 0.05, -0.04], [0.08, 0.05, 0.12], [0.26, 0.05, 0.07]]) {
        const ball = meshSphere(0.055, C.bruised);
        ball.position.set(rx + o[0], soilTop + o[1], hz + 0.1 + o[2]);
        cueRush.add(lit(ball, C.bruised, "harvest"));
      }
    }
    cueMachines.visible = cueStand.visible = cueRush.visible = false;

    const stages: FarmRole[] = ["field", "water", "harvest"];
    const stageGroup: { [k in FarmRole]: Group } = { field: fieldStage, water: waterStage, harvest: harvestStage };

    // a slow, uneven 0..1 wave for the "struggling/troubled" look — never a strobe.
    function flicker(t: number) {
      const w = 0.6 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_A * t)
              + 0.4 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_B * t + 1.3);
      return 0.5 + 0.5 * w;
    }

    // ---- the three calls the runner drives ----
    function reset() {
      reaction.field = reaction.water = reaction.harvest = null;
      appear.field = appear.water = appear.harvest = 0;
      droneActive = false;
      fieldStage.visible = waterStage.visible = harvestStage.visible = false;
      fieldStage.position.y = waterStage.position.y = harvestStage.position.y = 0;
      cueRows.visible = cueHand.visible = cueCrowded.visible = false;
      cueDrone.visible = cueSprinklers.visible = cueWilt.visible = false;
      cueMachines.visible = cueStand.visible = cueRush.visible = false;
      droneGroup.position.x = droneBaseX;
      for (const gp of glowParts) gp.mesh.material.emissiveIntensity = 0;
    }

    function addStage(i: number, optionIndex: number, r: StageReaction) {
      if (i === 0) {
        cueHand.visible = optionIndex === 0;    // option 0 = plant by hand (patchy)
        cueRows.visible = optionIndex === 1;    // option 1 = GPS tractor (tidy rows)
        cueCrowded.visible = optionIndex === 2; // option 2 = too many seeds (choked)
        reaction.field = r; appear.field = 0; fieldStage.visible = true;
      } else if (i === 1) {
        cueSprinklers.visible = optionIndex === 0; // option 0 = water the whole field
        cueDrone.visible = optionIndex === 1;      // option 1 = sensor drone
        cueWilt.visible = optionIndex === 2;       // option 2 = wait until they wilt
        droneActive = optionIndex === 1;
        reaction.water = r; appear.water = 0; waterStage.visible = true;
      } else if (i === 2) {
        cueStand.visible = optionIndex === 0;    // option 0 = by hand to the local stand
        cueMachines.visible = optionIndex === 1; // option 1 = modern machines to market
        cueRush.visible = optionIndex === 2;     // option 2 = rush (bruised haul)
        reaction.harvest = r; appear.harvest = 0; harvestStage.visible = true;
      }
    }

    function tick(clock: number) {
      const t = clock / 1000;
      // ease each freshly-added stage up into place (a gentle rise, no pop).
      for (const key of stages) {
        if (reaction[key] && appear[key] < 1) {
          appear[key] = Math.min(1, appear[key] + STAGING.TICK_MS / STAGING.APPEAR_MS);
        }
        const e = 1 - (1 - appear[key]) * (1 - appear[key]); // ease-out
        stageGroup[key].position.y = (1 - e) * -STAGING.APPEAR_RISE;
      }
      // drive each role-tagged light to match its stage's reaction.
      for (const gp of glowParts) {
        const r = reaction[gp.role];
        if (!r) continue;
        let v: number;
        if (r === "thrive") v = STAGING.THRIVE_GLOW + STAGING.THRIVE_PULSE_AMP * Math.sin(2 * Math.PI * STAGING.THRIVE_PULSE_HZ * t);
        else if (r === "neutral") v = STAGING.NEUTRAL_GLOW;
        else v = STAGING.STRUGGLE_GLOW_MIN + (STAGING.STRUGGLE_GLOW_MAX - STAGING.STRUGGLE_GLOW_MIN) * flicker(t);
        gp.mesh.material.emissiveIntensity = v * appear[gp.role];
      }
      // the sensor drone sweeps slowly side to side over the field as it scans.
      if (droneActive) {
        droneGroup.position.x = droneBaseX + Math.sin(2 * Math.PI * F.DRONE_SWEEP_HZ * t) * F.DRONE_SWEEP;
      }
    }

    reset();
    return { group, reset, addStage, tick };
  }

  const techStaging = buildTechStaging();
  stopScenes["tech"].add(techStaging.group);
  stopStagings["tech"] = techStaging;

  // Tourism Hub: the colonial village that assembles on the green as the student
  // decides. Same { group, reset, addStage, tick } contract the runner drives.
  const tourismStaging = buildTourismStaging();
  stopScenes["tourism"].add(tourismStaging.group);
  stopStagings["tourism"] = tourismStaging;

  // Modern Farm: the field that plants, waters, and harvests itself on the plot as
  // the student decides. Same { group, reset, addStage, tick } contract the runner drives.
  const farmStaging = buildFarmStaging();
  stopScenes["farm"].add(farmStaging.group);
  stopStagings["farm"] = farmStaging;

  // ======================================================================
  // PORT OF VIRGINIA  —  the signature stop's custom container-loading game.
  // buildPortScene() is the calm dock + harbor backdrop (registered like the other
  // stops' scenes). buildPortGame() is the game: three MARKET ships, a recycling supply
  // of PRODUCT containers, and the match-and-load loop. The interaction is the SAME
  // point-and-click the map landmarks and the choice cards use (Interactable + a fresh
  // Pressed edge), so it is reliable and familiar: TAP a product to select it (it
  // lifts and glows; tapping it again or empty water deselects), then TAP a ship to
  // send it flying there in a smooth arc. Reaching the ship whose market WANTS that
  // product loads it (chime + the ship glows gold and its count goes up); the wrong
  // market gently refuses (a soft click + a red blink) and the product flies back to its
  // slot, no penalty. Only one product is selected and in flight at a time. Every loop and
  // animation is setInterval (rAF pauses in the headset).
  // ======================================================================

  // A small readable sign baked on a canvas (DOM panels do not show in the headset),
  // used for each ship's destination label. Front faces +Z, toward the student.
  function portSign(text: string, accent: string): Mesh {
    const W = 460, H = 170;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    // Parchment card, so the dark place name reads clearly against the same-color hull.
    ctx.fillStyle = "#fbf3dd";
    ctx.fillRect(8, 8, W - 16, H - 16);
    // A thick border AND a bold bottom bar in the SHIP'S COLOR, tying the destination name
    // to the color the student must match (the hull, flag, and containers all share it).
    ctx.lineWidth = 14;
    ctx.strokeStyle = accent;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.fillStyle = accent;
    ctx.fillRect(22, H - 44, W - 44, 24);
    // The place name: big, bold, high-contrast navy, shrunk to fit the longest label.
    ctx.fillStyle = "#14253c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 74;
    do { ctx.font = "bold " + size + "px sans-serif"; size -= 2; }
    while (ctx.measureText(text).width > W - 60 && size > 16);
    ctx.fillText(text, W / 2, H / 2 - 8);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return new Mesh(
      new PlaneGeometry(0.82, 0.30),
      new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide }),
    );
  }

  // A small "what this market buys" placard for a ship's bow. The wants line is split at
  // the colon into a heading line and a products line so it reads in two clear rows, dark
  // on parchment with the ship's color as the border. Front faces +Z, toward the student.
  function wantsSign(text: string, accent: string): Mesh {
    const W = 600, H = 200;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#fbf3dd";
    ctx.fillRect(10, 10, W - 20, H - 20);
    ctx.lineWidth = 12;
    ctx.strokeStyle = accent;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = "#14253c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fit = (s: string, start: number) => {
      let sz = start;
      do { ctx.font = "bold " + sz + "px sans-serif"; sz -= 2; }
      while (ctx.measureText(s).width > W - 64 && sz > 16);
    };
    const ci = text.indexOf(": ");
    if (ci >= 0) {
      const head = text.slice(0, ci + 1);   // e.g. "Europe buys:"
      const items = text.slice(ci + 2);     // e.g. "Machines, Lumber"
      fit(head, 44); ctx.fillText(head, W / 2, 74);
      fit(items, 56); ctx.fillText(items, W / 2, 140);
    } else {
      fit(text, 52); ctx.fillText(text, W / 2, H / 2);
    }
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return new Mesh(
      new PlaneGeometry(1.1, (1.1 * H) / W),
      new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide }),
    );
  }

  // A simple white icon drawn on a container face: a picture cue for the product so a
  // student who cannot read the label yet has more than color to go on. Every shape is a
  // basic canvas primitive (no art assets). hole is the face color, used to "punch" gaps
  // (gear center, log rings, fish eye) without making the texture transparent.
  function drawProductIcon(
    ctx: CanvasRenderingContext2D, icon: string,
    cx: number, cy: number, r: number, fill: string, hole: string,
  ) {
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const disc = (x: number, y: number, rr: number, col: string) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    };
    if (icon === "soybeans") {            // a little pod of three beans
      disc(cx - r * 0.55, cy, r * 0.34, fill);
      disc(cx, cy - r * 0.12, r * 0.34, fill);
      disc(cx + r * 0.55, cy, r * 0.34, fill);
    } else if (icon === "coal") {         // a chunky lump
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy + r * 0.1);
      ctx.lineTo(cx - r * 0.4, cy - r * 0.7);
      ctx.lineTo(cx + r * 0.5, cy - r * 0.55);
      ctx.lineTo(cx + r * 0.95, cy + r * 0.2);
      ctx.lineTo(cx + r * 0.35, cy + r * 0.8);
      ctx.lineTo(cx - r * 0.6, cy + r * 0.7);
      ctx.closePath(); ctx.fill();
    } else if (icon === "gear") {         // a toothed gear with a punched hub
      ctx.fillStyle = fill;
      const teeth = 8;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.rotate(a);
        ctx.fillRect(-r * 0.2, -r * 0.2, r * 0.4, r * 0.4);
        ctx.restore();
      }
      disc(cx, cy, r * 0.72, fill);
      disc(cx, cy, r * 0.3, hole);
    } else if (icon === "lumber") {       // three stacked log ends (rings)
      const pos: [number, number][] = [[cx - r * 0.5, cy + r * 0.4], [cx + r * 0.5, cy + r * 0.4], [cx, cy - r * 0.45]];
      for (const [x, y] of pos) { disc(x, y, r * 0.44, fill); disc(x, y, r * 0.2, hole); }
    } else if (icon === "chicken") {      // a drumstick: a round end and a bone
      disc(cx - r * 0.2, cy - r * 0.2, r * 0.6, fill);
      ctx.strokeStyle = fill; ctx.lineWidth = r * 0.34;
      ctx.beginPath(); ctx.moveTo(cx + r * 0.1, cy + r * 0.1); ctx.lineTo(cx + r * 0.8, cy + r * 0.8); ctx.stroke();
      disc(cx + r * 0.86, cy + r * 0.86, r * 0.2, fill);
    } else if (icon === "fish") {         // an oval body with a triangle tail and an eye
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy, r * 0.85, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy);
      ctx.lineTo(cx - r * 1.15, cy - r * 0.5);
      ctx.lineTo(cx - r * 1.15, cy + r * 0.5);
      ctx.closePath(); ctx.fill();
      disc(cx + r * 0.55, cy - r * 0.12, r * 0.12, hole);
    }
    ctx.restore();
  }

  // The COLORBLIND market shape (Phase 4.3): a star (Europe), circle (Asia), or stripe
  // (USA), drawn in `fill` and centered at cx,cy within radius r. The SAME shape marks
  // a container face and its target ship's flag, so a student can match by shape even
  // if the red/blue/green colors look alike to them.
  function drawMarketShape(ctx: CanvasRenderingContext2D, shape: string, cx: number, cy: number, r: number, fill: string) {
    ctx.save();
    ctx.fillStyle = fill;
    if (shape === "circle") {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    } else if (shape === "stripe") {
      // three bold horizontal bars (reads as a distinct pattern, not a solid block)
      const bw = r * 2, bh = r * 0.42, gap = r * 0.28;
      for (let i = -1; i <= 1; i++) {
        const y = cy + i * (bh + gap);
        if ((ctx as any).roundRect) { ctx.beginPath(); (ctx as any).roundRect(cx - bw / 2, y - bh / 2, bw, bh, bh / 2); ctx.fill(); }
        else ctx.fillRect(cx - bw / 2, y - bh / 2, bw, bh);
      }
    } else { // "star": a five-point star
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.42;
        const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // The product face for a container: the market's backup color fills the cube (so it
  // still reads red / blue / green at a glance), with a white product icon in the color
  // field and the product name on a cream strip below. Painted once per product, reused.
  function productFaceTexture(p: { name: string; color: string; icon: string; market: string }): CanvasTexture {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = p.color;                  // the dominant backup color (the match-by-color aid)
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";     // a faint edge so the cube reads as a box
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, S - 12, S - 12);
    drawProductIcon(ctx, p.icon, S / 2, 86, 44, "#ffffff", p.color);
    // The COLORBLIND market badge (Phase 4.3): a dark rounded chip in the top-left with
    // the market's white shape, matching the shape on this market's ship flag.
    const shape = PORT.MARKET_SHAPE[p.market];
    if (shape) {
      ctx.fillStyle = "rgba(20,37,60,0.6)";
      if ((ctx as any).roundRect) { ctx.beginPath(); (ctx as any).roundRect(14, 14, 66, 66, 16); ctx.fill(); }
      else ctx.fillRect(14, 14, 66, 66);
      drawMarketShape(ctx, shape, 47, 47, 22, "#ffffff");
    }
    ctx.fillStyle = "#fbf3dd";                // a cream name strip across the lower third
    const sy = 158, sh = 78;
    if ((ctx as any).roundRect) { ctx.beginPath(); (ctx as any).roundRect(18, sy, S - 36, sh, 14); ctx.fill(); }
    else ctx.fillRect(18, sy, S - 36, sh);
    ctx.fillStyle = "#14253c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 46;
    do { ctx.font = "bold " + size + "px sans-serif"; size -= 2; }
    while (ctx.measureText(p.name).width > S - 56 && size > 14);
    ctx.fillText(p.name, S / 2, sy + sh / 2);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  // The calm backdrop: a wood dock underfoot, open harbor water the ships sit in,
  // and a few distant cranes for flavor. The water shimmers very slowly in tick().
  function buildPortScene(): { group: Group; tick: (clock: number) => void } {
    const g = new Group();
    const water = meshBox(40, 0.1, 40, PORT.WATER_COLOR);
    water.position.set(0, PORT.WATER_Y, -6);
    (water.material as any).emissive = new Color(PORT.WATER_COLOR);
    (water.material as any).emissiveIntensity = 0;
    g.add(water);
    // the dock the student stands on, with a darker trim lip and a row of pilings.
    const dock = meshBox(7.6, 0.16, 5.4, PORT.DOCK_COLOR);
    dock.position.set(0, -0.02, 6.0);
    g.add(dock);
    const trim = meshBox(7.8, 0.08, 0.22, PORT.DOCK_TRIM);
    trim.position.set(0, 0.06, 3.3);
    g.add(trim);
    for (const px of [-3.5, -1.2, 1.2, 3.5]) {
      const pile = meshCyl(0.12, 0.12, 1.1, PORT.PILING);
      pile.position.set(px, -0.35, 3.3);
      g.add(pile);
    }
    // (The container supply is now a MOVING CONVEYOR, built in buildPortGame so its
    // travel animates with the containers; the old static plank shelf is gone.)

    // A WARM SKY: a wide gradient backdrop low on the horizon (soft blue easing to a
    // warm peach), far out behind everything so it never interferes. Drawn unlit.
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 16; skyCanvas.height = 256;
    const sctx = skyCanvas.getContext("2d") as CanvasRenderingContext2D;
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, PORT.SKY_TOP);
    grad.addColorStop(0.52, PORT.SKY_MID);
    grad.addColorStop(1, PORT.SKY_HORIZON);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 16, 256);
    const skyTex = new CanvasTexture(skyCanvas);
    skyTex.colorSpace = SRGBColorSpace;
    const sky = new Mesh(
      new PlaneGeometry(PORT.SKY_W, PORT.SKY_H),
      // OPAQUE (writes depth): a far plane at z=-16 that occludes the default sky behind it
      // and is itself occluded by the nearer ships / belt / water. (A non-depth-writing
      // version got overdrawn by the default skydome.)
      new MeshBasicMaterial({ map: skyTex }),
    );
    sky.position.set(0, PORT.SKY_Y, PORT.SKY_Z);
    g.add(sky);
    // a soft low sun, off to one side (never behind a ship sign): a warm emissive disc
    // with a faint halo. Far out, in front of the sky band.
    const halo = meshSphere(PORT.SUN_R * 2.1, PORT.SUN_COLOR);
    (halo.material as any).transparent = true; (halo.material as any).opacity = 0.16;
    (halo.material as any).depthWrite = false;
    halo.position.set(PORT.SUN_POS[0], PORT.SUN_POS[1], PORT.SUN_POS[2] + 0.2);
    g.add(halo);
    const sun = meshSphere(PORT.SUN_R, PORT.SUN_COLOR);
    (sun.material as any).emissive = new Color(PORT.SUN_COLOR);
    (sun.material as any).emissiveIntensity = 0.9;
    sun.position.set(PORT.SUN_POS[0], PORT.SUN_POS[1], PORT.SUN_POS[2]);
    g.add(sun);

    // distant dock cranes, well past the ships and never in reach (harbor depth).
    for (const cx of [-4.7, -2.4, 2.5, 4.7]) {
      const crane = new Group();
      for (const lx of [-0.4, 0.4]) {
        const leg = meshBox(0.12, 2.6, 0.12, PORT.CRANE_LEG);
        leg.position.set(lx, 1.3, 0);
        crane.add(leg);
      }
      const top = meshBox(1.0, 0.16, 0.16, PORT.CRANE);
      top.position.set(0, 2.5, 0);
      crane.add(top);
      const arm = meshBox(0.16, 0.16, 2.0, PORT.CRANE);
      arm.position.set(0, 2.5, 0.9);
      crane.add(arm);
      crane.position.set(cx, 0, -2.8);
      g.add(crane);
    }

    // TWO TALL LOADING CRANES framing the dock at the far sides (outside the ship row
    // and the conveyor), each a tower + a jib reaching out over the water + a hanging
    // cable and hook. Static; the moving belt and sailing ships carry the motion.
    for (const cx of [-PORT.LOAD_CRANE_X, PORT.LOAD_CRANE_X]) {
      const crane = new Group();
      const H = PORT.LOAD_CRANE_H;
      const tower = meshBox(0.34, H, 0.34, PORT.LOAD_CRANE_TOWER);
      tower.position.set(0, H / 2, 0);
      crane.add(tower);
      for (const ry of [H * 0.32, H * 0.62]) { // a couple of rungs hint at a lattice tower
        const rung = meshBox(0.46, 0.08, 0.46, PORT.LOAD_CRANE_FRAME);
        rung.position.set(0, ry, 0);
        crane.add(rung);
      }
      const cab = meshBox(0.5, 0.4, 0.5, PORT.LOAD_CRANE_FRAME); // operator cab near the top
      cab.position.set(0, H - 0.55, 0.22);
      crane.add(cab);
      const jib = meshBox(0.16, 0.16, PORT.LOAD_CRANE_JIB, PORT.LOAD_CRANE_FRAME); // arm over the water (-z)
      jib.position.set(0, H, -PORT.LOAD_CRANE_JIB / 2 + 0.2);
      crane.add(jib);
      const counter = meshBox(0.16, 0.16, 0.8, PORT.LOAD_CRANE_FRAME); // short counter-jib (+z)
      counter.position.set(0, H, 0.6);
      crane.add(counter);
      const cableZ = -PORT.LOAD_CRANE_JIB + 0.5; // cable hangs from out along the jib
      const cable = meshCyl(0.02, 0.02, H * 0.5, PORT.LOAD_CRANE_CABLE);
      cable.position.set(0, H - H * 0.25, cableZ);
      crane.add(cable);
      const hook = meshBox(0.16, 0.16, 0.16, PORT.LOAD_CRANE_FRAME);
      hook.position.set(0, H - H * 0.5, cableZ);
      crane.add(hook);
      crane.position.set(cx, 0, PORT.LOAD_CRANE_Z);
      g.add(crane);
    }
    function tick(clock: number) {
      const s = (Math.sin(clock * 0.001 * Math.PI * 2 * PORT.WATER_HZ) * 0.5 + 0.5) * PORT.WATER_SHIMMER;
      (water.material as any).emissiveIntensity = s;
    }
    return { group: g, tick };
  }

  // One low-poly ship: a colored hull, a deck rim, a stern wheelhouse, a mast with a
  // destination-colored flag, and a destination label facing the student. The group
  // sits at the ship's dock position; the game's tick() bobs and pulses it.
  function buildShip(ship: { key: string; label: string; color: string; wants: string; pos: [number, number, number] }) {
    const g = new Group();
    const H = PORT.SHIP_HULL_H;
    const hull = meshBox(PORT.SHIP_HULL_W, H, PORT.SHIP_HULL_D, ship.color);
    hull.position.set(0, PORT.DECK_Y - H / 2, 0);
    (hull.material as any).emissive = new Color("#ffd76a"); // gold "loaded!" pulse, intensity set in tick
    (hull.material as any).emissiveIntensity = 0;
    g.add(hull);
    const rim = meshBox(PORT.SHIP_HULL_W * 0.9, 0.07, PORT.SHIP_HULL_D * 0.9, "#363b41");
    rim.position.set(0, PORT.DECK_Y + 0.035, 0);
    g.add(rim);
    const cabin = meshBox(PORT.SHIP_HULL_W * 0.46, 0.32, 0.34, "#eae3d2");
    cabin.position.set(0, PORT.DECK_Y + 0.19, PORT.SHIP_HULL_D * 0.32);
    g.add(cabin);
    const mast = meshCyl(0.025, 0.025, 0.7, "#6d5636");
    mast.position.set(0, PORT.DECK_Y + 0.5, PORT.SHIP_HULL_D * 0.32);
    g.add(mast);
    // The flag carries the market color AND its colorblind shape (Phase 4.3), so it
    // matches the shape badge on every container bound for this ship.
    const flagShape = PORT.MARKET_SHAPE[ship.key];
    const flagC = document.createElement("canvas"); flagC.width = 128; flagC.height = 84;
    const flagCtx = flagC.getContext("2d") as CanvasRenderingContext2D;
    flagCtx.fillStyle = ship.color; flagCtx.fillRect(0, 0, 128, 84);
    if (flagShape) drawMarketShape(flagCtx, flagShape, 64, 42, 27, "#ffffff");
    const flagTex = new CanvasTexture(flagC); flagTex.colorSpace = SRGBColorSpace;
    const flag = new Mesh(new PlaneGeometry(0.36, 0.24), new MeshBasicMaterial({ map: flagTex, side: DoubleSide }));
    flag.position.set(0.2, PORT.DECK_Y + 0.72, PORT.SHIP_HULL_D * 0.32);
    g.add(flag);
    const sign = portSign(ship.label, ship.color);
    sign.position.set(0, PORT.DECK_Y + 0.5, 0.02);
    g.add(sign);
    // the "what this market buys" placard, mounted flat on the bow (front face, toward the
    // student) and low on the hull so it clears the name sign, the cabin, and the mast.
    const wsign = wantsSign(ship.wants, ship.color);
    wsign.position.set(0, PORT.DECK_Y - 0.18, PORT.SHIP_HULL_D / 2 + 0.02);
    g.add(wsign);
    g.position.set(ship.pos[0], 0, ship.pos[2]);
    return { group: g, hull };
  }

  function buildPortGame() {
    const group = new Group();   // ships + the debug panel live here (hide with the scene)
    let portClock = 0;

    // a market's color is its ship's color (one source of truth for the manifest swatches).
    const colorByKey: Record<string, string> = {};
    for (const s of PORT.SHIPS) colorByKey[s.key] = s.color;

    // the six products, looked up by name, plus a painted face texture per product (built
    // once and reused as containers cycle). A container shows a product; the product's
    // market decides which ship it belongs on, and its backup color tints the cube.
    const productByName: Record<string, { name: string; market: string; color: string; icon: string }> = {};
    const texByProduct: Record<string, CanvasTexture> = {};
    for (const p of PORT.PRODUCTS) { productByName[p.name] = p; texByProduct[p.name] = productFaceTexture(p); }

    // ---- the three ships, each with ONE generous invisible hit-pad wrapping the whole ship
    // the student TAPS to send the selected container. The pad is its OWN entity
    // (createTransformEntity reparents it to the scene root) and fully transparent (opacity 0).
    // It is a ray target ONLY while a container is selected (tick adds/removes its Interactable),
    // so between loads the ray passes through it to the Finish button, and it never blocks the hub. ----
    // x/z are the fixed BERTH coords; the ship's live group.position.z slides out and
    // back during a departure cycle. state: "docked" (loadable, pad live) -> "sailing"
    // (out to sea, pad inert) -> "arriving" (a fresh same-destination ship pulls in) ->
    // "docked". dockTimer counts the calm docked stretch; sailT drives the sail anim.
    // padLive tracks whether the pad is currently a ray target, so we toggle only on a change.
    const ships: {
      key: string; x: number; z: number; group: Group; hull: any; pulse: number;
      pad: any; padMesh: any; padWasPressed: boolean; padLive: boolean;
      state: string; dockTimer: number; sailT: number;
    }[] = [];
    let shipIdx = 0;
    for (const s of PORT.SHIPS) {
      const built = buildShip(s);
      group.add(built.group);
      const padMesh = meshBox(PORT.PAD_W, PORT.PAD_H, PORT.PAD_D, "#ffffff");
      (padMesh.material as any).transparent = true;
      (padMesh.material as any).opacity = 0;       // fully transparent, never a hidden mesh, so it always registers a tap
      (padMesh.material as any).depthWrite = false;
      padMesh.castShadow = false; padMesh.receiveShadow = false;
      padMesh.position.set(s.pos[0], PORT.PAD_Y, s.pos[2]);
      padMesh.visible = false;                      // shown only inside the port (start/stop)
      // Born INERT (no Interactable): tick adds it as a ray target only while a container is
      // selected, and removes it otherwise, so it never shadows the Finish button or the hub.
      const pad = world.createTransformEntity(padMesh);
      ships.push({ key: s.key, x: s.pos[0], z: s.pos[2], group: built.group, hull: built.hull,
                   pulse: 0, pad, padMesh, padWasPressed: false, padLive: false,
                   state: "docked", dockTimer: PORT.DOCK_MS_FIRST + shipIdx * PORT.DOCK_STAGGER, sailT: 0 });
      shipIdx++;
    }

    // The empty-water deselect catcher (see CONSTANTS): a big invisible plane BEHIND every
    // ship. The ray picks the nearest target, so a container or ship is always hit first;
    // only a tap that misses everything reaches this plane and clears the selection. It is
    // shown in the port and parked otherwise, the same as the ship pads.
    const catchMesh = new Mesh(
      new PlaneGeometry(PORT.CATCH_W, PORT.CATCH_H),
      new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }),
    );
    catchMesh.position.set(0, PORT.CATCH_Y, PORT.CATCH_Z);
    catchMesh.visible = false;
    const catchEntity = world.createTransformEntity(catchMesh).addComponent(Interactable);
    let catchWasPressed = false;

    // ---- the live SHIPPED manifest (a canvas panel): per-ship correct-load counts +
    // a running total. It is the student's in-play feedback AND the score source: the
    // final counts drive the result panel and the three-meter award on round-end. ----
    const counts: Record<string, number> = { europe: 0, asia: 0, usa: 0 };
    const panelCanvas = document.createElement("canvas");
    panelCanvas.width = 512; panelCanvas.height = 410;
    const pctx = panelCanvas.getContext("2d") as CanvasRenderingContext2D;
    const panelTex = new CanvasTexture(panelCanvas);
    panelTex.colorSpace = SRGBColorSpace;
    const panelMesh = new Mesh(
      new PlaneGeometry(PORT.DEBUG_W, PORT.DEBUG_H),
      new MeshBasicMaterial({ map: panelTex, transparent: true, side: DoubleSide }),
    );
    (panelMesh.material as any).depthTest = false;
    (panelMesh.material as any).depthWrite = false;
    panelMesh.renderOrder = 50000;
    panelMesh.position.set(PORT.DEBUG_POS[0], PORT.DEBUG_POS[1], PORT.DEBUG_POS[2]);
    group.add(panelMesh);
    function drawCounts() {
      const W = 512, Hh = 410;
      pctx.clearRect(0, 0, W, Hh);
      pctx.fillStyle = "#fbf3dd";
      pctx.fillRect(8, 8, W - 16, Hh - 16);
      pctx.lineWidth = 10;
      pctx.strokeStyle = "#caa24a";
      pctx.strokeRect(8, 8, W - 16, Hh - 16);
      pctx.fillStyle = "#1F3A5F";
      pctx.textBaseline = "middle";
      pctx.textAlign = "left";
      pctx.font = "bold 38px sans-serif";
      pctx.fillText("SHIPPED", 34, 54);
      const rows: [string, string][] = [["Europe", "europe"], ["Asia", "asia"], ["United States", "usa"]];
      let y = 128;
      for (const [label, key] of rows) {
        pctx.fillStyle = colorByKey[key];
        pctx.fillRect(34, y - 20, 40, 40);
        pctx.fillStyle = "#1F3A5F";
        pctx.font = "bold 34px sans-serif";
        pctx.textAlign = "left";
        pctx.fillText(label, 88, y);
        pctx.textAlign = "right";
        pctx.fillText(String(counts[key] || 0), W - 40, y);
        y += 66;
      }
      const total = (counts.europe || 0) + (counts.asia || 0) + (counts.usa || 0);
      pctx.fillStyle = "#7d6038";
      pctx.fillRect(34, y - 14, W - 68, 4);
      pctx.fillStyle = "#1F3A5F";
      pctx.font = "bold 40px sans-serif";
      pctx.textAlign = "left";
      pctx.fillText("Total", 88, y + 34);
      pctx.textAlign = "right";
      pctx.fillText(String(total), W - 40, y + 34);
      panelTex.needsUpdate = true;
    }

    // ======================================================================
    // THE MOVING CONVEYOR  —  a slow left->right belt that carries the supply into reach.
    // The belt has BELT_N evenly-spaced "slots" that travel together and wrap; a container
    // rides its slot. slotX/slotScale below place each slot and fade it 0<->1 near the belt
    // ends, so containers grow in at the left, ride across full size, and shrink away at the
    // right (the wrap is never a visible jump). beltOffset is advanced in tick (setInterval).
    // ======================================================================
    const BELT_LEN = PORT.BELT_X_MAX - PORT.BELT_X_MIN;
    const BELT_STEP = BELT_LEN / PORT.BELT_N;          // spacing between neighbouring slots
    const BELT_TOP_Y = PORT.BELT_Y - PORT.CONTAINER / 2; // belt surface (containers sit on it)
    let beltOffset = 0;                                 // how far the belt has travelled (mod BELT_LEN)
    function smoothstep(t: number) { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); }
    function slotPhase(i: number) { return (beltOffset + i * BELT_STEP) % BELT_LEN; }
    function slotX(i: number) { return PORT.BELT_X_MIN + slotPhase(i); }
    function slotScale(i: number) {              // 0 at the belt ends (the seam), 1 across the middle
      const p = slotPhase(i);
      const distToSeam = Math.min(p, BELT_LEN - p);
      return smoothstep(distToSeam / (PORT.BELT_SEAM_FRAC * BELT_LEN));
    }

    // The belt STRUCTURE: a dark bed with a scrolling chevron surface (the motion cue),
    // two side rails, two end rollers, and legs down to the dock. All static geometry;
    // only the chevron texture offset scrolls (in tick), matching the container travel.
    const beltCenterX = (PORT.BELT_X_MIN + PORT.BELT_X_MAX) / 2;
    const beltFullLen = BELT_LEN + PORT.BELT_BED_PAD * 2;
    const chevCanvas = document.createElement("canvas");
    chevCanvas.width = 128; chevCanvas.height = 64;
    const cvx = chevCanvas.getContext("2d") as CanvasRenderingContext2D;
    cvx.fillStyle = PORT.BELT_BED_COLOR; cvx.fillRect(0, 0, 128, 64);
    cvx.strokeStyle = PORT.BELT_CHEVRON; cvx.lineWidth = 10; cvx.lineCap = "round";
    for (const ox of [16, 80]) {                  // two ">" chevrons per tile, pointing in the travel direction
      cvx.beginPath(); cvx.moveTo(ox, 14); cvx.lineTo(ox + 26, 32); cvx.lineTo(ox, 50); cvx.stroke();
    }
    const chevTex = new CanvasTexture(chevCanvas);
    chevTex.colorSpace = SRGBColorSpace;
    chevTex.wrapS = RepeatWrapping; chevTex.wrapT = RepeatWrapping;
    chevTex.repeat.set(PORT.BELT_CHEVRON_REPEAT, 1);
    const bed = meshBox(beltFullLen, 0.1, PORT.BELT_BED_D, PORT.BELT_BED_COLOR);
    (bed.material as any).map = chevTex;
    bed.position.set(beltCenterX, BELT_TOP_Y - 0.05, PORT.BELT_Z);
    group.add(bed);
    for (const dz of [-PORT.BELT_BED_D / 2, PORT.BELT_BED_D / 2]) { // two side rails
      const rail = meshBox(beltFullLen + 0.1, 0.12, 0.06, PORT.BELT_RAIL_COLOR);
      rail.position.set(beltCenterX, BELT_TOP_Y + 0.02, PORT.BELT_Z + dz);
      group.add(rail);
    }
    for (const dx of [-beltFullLen / 2, beltFullLen / 2]) {        // two end rollers (cylinders across z)
      const roller = meshCyl(0.1, 0.1, PORT.BELT_BED_D + 0.04, PORT.BELT_ROLLER_COLOR);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(beltCenterX + dx, BELT_TOP_Y - 0.02, PORT.BELT_Z);
      group.add(roller);
    }
    for (const lx of [beltCenterX - beltFullLen / 2 + 0.3, beltCenterX + beltFullLen / 2 - 0.3]) {
      const leg = meshBox(0.14, BELT_TOP_Y - 0.1, 0.14, PORT.BELT_LEG_COLOR); // legs down to the dock
      leg.position.set(lx, (BELT_TOP_Y - 0.1) / 2, PORT.BELT_Z);
      group.add(leg);
    }

    // ---- the recycling container supply (now riding the conveyor) ----
    // Each container is a cube ENTITY the student TAPS to select (Interactable, the same
    // ray the map landmarks and the choice cards use). Its STATE drives everything: an idle
    // cube rides its belt slot; a selected one lifts and glows; a flying one arcs to a
    // ship; a loaded one parks far below the world (invisible AND, thanks to the hidden-
    // target hit guard, untappable) until it rejoins the belt. Rotation stays locked so
    // the cube reads upright and its color stays clear (scale carries the belt-end fade).
    type Cont = {
      entity: any; mesh: any; key: string; product: string; slot: number; state: string; wasPressed: boolean;
      fx: number; fy: number; fz: number;         // flight / return START point (world)
      tx: number; ty: number; tz: number;         // flight TARGET point: the ship deck (world)
      targetShip: any;                            // the ship a flying container is bound for
      t: number; dur: number; tint: number; timer: number;
      heldX: number;                              // x frozen while selected, so a lifted cube does not drift with the belt
      appearT: number;                            // scale-in ramp (ms) when (re)joining the belt, so it never pops
    };
    const conts: Cont[] = [];
    for (let i = 0; i < PORT.BELT_N; i++) {
      const mesh = meshBox(PORT.CONTAINER, PORT.CONTAINER, PORT.CONTAINER, "#ffffff");
      (mesh.material as any).emissive = new Color(PORT.WRONG_GLOW); // red "wrong ship" blink; gold while selected
      (mesh.material as any).emissiveIntensity = 0;
      mesh.visible = false;
      mesh.position.set(0, PORT.PARK_Y, 0);
      const entity = world.createTransformEntity(mesh).addComponent(Interactable);
      conts.push({ entity, mesh, key: "europe", product: "Machines", slot: i, state: "parked", wasPressed: false,
                   fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0, targetShip: null,
                   t: 0, dur: 0, tint: 0, timer: 0, heldX: 0, appearT: PORT.ENTER_MS });
    }
    let selectedCont: Cont | null = null;  // the one tapped container (lifts + glows), or none
    let flyingCont: Cont | null = null;    // the one container mid-arc, or none (only one at a time)

    // ======================================================================
    // ON-ARRIVAL DIRECTIONS (guidance only; the load mechanic / count / timers are NOT
    // touched). An intro panel + Start button explain the goal, then a short hint follows
    // the play. Everything draws on top and sits above the dock so it never covers the
    // ships / containers / count, and text redraws only on a change (nothing flashes).
    // ======================================================================
    let portStarted = false;                 // false while the intro is up; true once Start is tapped
    let ended = false;                        // true once the round is over and the result is up
    let resultMesh: any = null;               // the result readout card (rebuilt each round-end)
    let portThenNow: any = null;              // the THEN AND NOW card, shown before the result at round-end
    let endToken = 0;                         // bumped each round-end / on leaving, to guard the delayed result reveal
    function onTop(mesh: any) {               // always readable, never depth-clipped by sky/ships
      (mesh.material as any).depthTest = false;
      (mesh.material as any).depthWrite = false;
      mesh.renderOrder = 50000;
    }

    // (1) The arrival card: the place name + one friendly line about the task, in the
    // SAME short arrival-card style the three decision stops use (name + line + Start).
    // Start dismisses it and begins play; the in-play hint below reminds the controls.
    const introPanel = makeTextPanel(
      "Port of Virginia",
      "The Port of Virginia in Norfolk is one of the busiest ports in the country. It connects Virginia to over 200 countries. Load each product onto the ship for the market that wants it.",
      PORT.INTRO_W,
    );
    onTop(introPanel);
    introPanel.position.set(PORT.INTRO_POS[0], PORT.INTRO_POS[1], PORT.INTRO_POS[2]);
    introPanel.visible = false;
    group.add(introPanel);

    // The Start button that dismisses the intro (its own Interactable entity, like the ship
    // pads; rides the intro card's lower margin, shown only while the intro is up).
    const startBtnMesh = makeButtonCard("Start", PORT.START_W, PORT.START_H);
    onTop(startBtnMesh);
    startBtnMesh.renderOrder = 50001;
    startBtnMesh.position.set(PORT.START_POS[0], PORT.START_POS[1], PORT.START_POS[2]);
    startBtnMesh.visible = false;
    const startBtn = world.createTransformEntity(startBtnMesh).addComponent(Interactable);
    let startWasPressed = false;

    // The FINISH button: the student taps it when their haul is in, which ENDS the round
    // and brings up the result. Its own Interactable, like the Start button; shown only
    // during live play. (The ambient ships sailing out and back are flavor only — they
    // never end the round; FINISH is the one and only round-ender.)
    const portFinishMesh = makeButtonCard("Finish", PORT.FINISH_W, PORT.FINISH_H);
    onTop(portFinishMesh);
    portFinishMesh.renderOrder = 50001;
    portFinishMesh.position.set(PORT.FINISH_POS[0], PORT.FINISH_POS[1], PORT.FINISH_POS[2]);
    portFinishMesh.visible = false;
    const portFinishBtn = world.createTransformEntity(portFinishMesh).addComponent(Interactable);
    let portFinishWasPressed = false;

    // The RETURN button: shown WITH the result panel; a fresh press lands the score (the
    // shell's finishStop -> completeStop with the real pendingAward) and fades to the map.
    const returnMesh = makeButtonCard("Return to the map", PORT.RETURN_W, PORT.RETURN_H);
    onTop(returnMesh);
    returnMesh.renderOrder = 50001;
    returnMesh.position.set(PORT.RETURN_POS[0], PORT.RETURN_POS[1], PORT.RETURN_POS[2]);
    returnMesh.visible = false;
    const returnBtn = world.createTransformEntity(returnMesh).addComponent(Interactable);
    let returnWasPressed = false;

    // (2) The following hint: one short line on a navy pill near the dock, reworded as the
    // state changes (nothing selected -> pick one; one selected -> send it to its match).
    const hintCanvas = document.createElement("canvas");
    hintCanvas.width = 1024; hintCanvas.height = 192;
    const hctx = hintCanvas.getContext("2d") as CanvasRenderingContext2D;
    const hintTex = new CanvasTexture(hintCanvas);
    hintTex.colorSpace = SRGBColorSpace;
    const hintMesh = new Mesh(
      new PlaneGeometry(PORT.HINT_W, PORT.HINT_H),
      new MeshBasicMaterial({ map: hintTex, transparent: true, side: DoubleSide }),
    );
    onTop(hintMesh);
    hintMesh.position.set(PORT.HINT_POS[0], PORT.HINT_POS[1], PORT.HINT_POS[2]);
    hintMesh.visible = false;
    group.add(hintMesh);
    let hintState = "";
    function drawHint(text: string) {
      const W = 1024, Hh = 192;
      hctx.clearRect(0, 0, W, Hh);
      hctx.fillStyle = "rgba(31,58,95,0.92)";   // a soft navy pill, so white words read over the water
      if ((hctx as any).roundRect) { hctx.beginPath(); (hctx as any).roundRect(16, 16, W - 32, Hh - 32, 40); hctx.fill(); }
      else hctx.fillRect(16, 16, W - 32, Hh - 32);
      hctx.fillStyle = "#ffffff";
      hctx.textAlign = "center";
      hctx.textBaseline = "middle";
      let size = 56;
      do { hctx.font = "bold " + size + "px sans-serif"; size -= 2; }
      while (hctx.measureText(text).width > W - 96 && size > 20);
      hctx.fillText(text, W / 2, Hh / 2 + 2);
      hintTex.needsUpdate = true;
    }

    // (3) THE WHY-FACT POP (the teaching layer): a brief parchment card shown on each
    // CORRECT load so the student learns from the trade, not just sorts it. It is its own
    // canvas (drawn only when the fact changes, so nothing flashes), sits HIGH and centered
    // above the ships + belt (covering neither), and the running hint hides while it shows.
    // The fade rides the material opacity on setInterval, so it clears itself and never
    // blocks play. factT is the elapsed ms of the current fact's life.
    const factCanvas = document.createElement("canvas");
    factCanvas.width = 1024; factCanvas.height = 300;
    const fcx = factCanvas.getContext("2d") as CanvasRenderingContext2D;
    const factTex = new CanvasTexture(factCanvas);
    factTex.colorSpace = SRGBColorSpace;
    const factMesh = new Mesh(
      new PlaneGeometry(PORT.FACT_W, PORT.FACT_H),
      new MeshBasicMaterial({ map: factTex, transparent: true, side: DoubleSide }),
    );
    onTop(factMesh);
    factMesh.position.set(PORT.FACT_POS[0], PORT.FACT_POS[1], PORT.FACT_POS[2]);
    factMesh.visible = false;
    group.add(factMesh);
    let factActive = false;
    let factT = 0;
    function drawFact(text: string) {
      const W = 1024, Hh = 300;
      fcx.clearRect(0, 0, W, Hh);
      // a warm parchment card with a gold border, distinct from the navy hint pill
      fcx.fillStyle = "#fbf3dd";
      if ((fcx as any).roundRect) { fcx.beginPath(); (fcx as any).roundRect(14, 14, W - 28, Hh - 28, 34); fcx.fill(); }
      else fcx.fillRect(14, 14, W - 28, Hh - 28);
      fcx.lineWidth = 10; fcx.strokeStyle = "#caa24a";
      if ((fcx as any).roundRect) { fcx.beginPath(); (fcx as any).roundRect(14, 14, W - 28, Hh - 28, 34); fcx.stroke(); }
      else fcx.strokeRect(14, 14, W - 28, Hh - 28);
      // a small gold eyebrow, so the pop reads as a friendly fact
      fcx.fillStyle = "#8a6118";
      fcx.textAlign = "center"; fcx.textBaseline = "middle";
      fcx.font = "bold 32px sans-serif";
      fcx.fillText("DID YOU KNOW?", W / 2, 60);
      // the fact, navy, shrunk just enough to sit on two comfortable lines
      fcx.fillStyle = "#1F3A5F";
      let size = 46, lines: string[] = [];
      do {
        fcx.font = "bold " + size + "px sans-serif";
        lines = []; let line = "";
        for (const w of text.split(" ")) {
          const t = line ? line + " " + w : w;
          if (fcx.measureText(t).width > W - 130 && line) { lines.push(line); line = w; }
          else line = t;
        }
        if (line) lines.push(line);
        size -= 3;
      } while (lines.length > 2 && size > 26);
      const lh = 60, startY = 150 - ((lines.length - 1) * lh) / 2 + 28;
      for (let i = 0; i < lines.length; i++) fcx.fillText(lines[i], W / 2, startY + i * lh);
      factTex.needsUpdate = true;
    }
    function showFact(productName: string) {  // a correct load: pop the product's why-fact
      const f = PORT.WHY_FACT[productName];
      if (!f) return;
      drawFact(f);
      factT = 0;
      factActive = true;
      factMesh.visible = true;
      (factMesh.material as any).opacity = 0;  // tick fades it in from 0
    }
    function clearFact() {                    // tidy the fact (round end / leaving the stop)
      factActive = false; factT = 0;
      factMesh.visible = false;
      (factMesh.material as any).opacity = 1;
    }

    function showIntro() {                    // arrival: read the directions, hint hidden until Start
      portStarted = false;
      introPanel.visible = true;
      startBtnMesh.visible = true;
      startBtnMesh.scale.setScalar(1);
      startWasPressed = !!startBtn.hasComponent(Pressed); // never fire on a carried-over press
      hintMesh.visible = false;
      hintState = "";
    }
    function beginPlay() {                    // Start tapped: clear the intro, bring up the hint
      portStarted = true;
      ended = false;
      introPanel.visible = false;
      startBtnMesh.visible = false;
      portFinishMesh.visible = true;          // the FINISH round-ender is now available
      portFinishMesh.scale.setScalar(1);
      portFinishWasPressed = !!portFinishBtn.hasComponent(Pressed); // never fire on a carried-over press
      hintMesh.visible = true;
      hintState = "pick"; drawHint("Tap a product to pick it up");
      sfxClick();
    }

    // ---- SCORING ----  Turn the correct-load counts into the three meters: every
    // matched container adds PORT.SCORE_PER_LOAD (EI largest), plus the one-time
    // global-trade Innovation bonus if all three ships got at least one. Capped so a
    // long session stays inside one stop's share of the 0..100 meters. Wrong taps were
    // never counted, so they cost only time; there is no penalty here. (Module 6's
    // three meters: Economic Impact = ei, Innovation Thinking = it, Problem Solving = ps.)
    function computeAward() {
      const total = (counts.europe || 0) + (counts.asia || 0) + (counts.usa || 0);
      const allShips = (counts.europe || 0) > 0 && (counts.asia || 0) > 0 && (counts.usa || 0) > 0;
      let ei = total * PORT.SCORE_PER_LOAD.ei;
      let it = total * PORT.SCORE_PER_LOAD.it;
      let ps = total * PORT.SCORE_PER_LOAD.ps;
      if (allShips) { ei += PORT.ALL_SHIPS_BONUS.ei; it += PORT.ALL_SHIPS_BONUS.it; ps += PORT.ALL_SHIPS_BONUS.ps; }
      ei = Math.min(ei, PORT.SCORE_MAX.ei);
      it = Math.min(it, PORT.SCORE_MAX.it);
      ps = Math.min(ps, PORT.SCORE_MAX.ps);
      return { total, allShips, ei, it, ps };
    }

    // ---- ROUND END ----  The single path that closes the round: a FINISH press. Compute
    // the haul, set pendingAward to the REAL totals, show the color-coded result the rest of
    // the game uses (a friendly line by haul size, the count shipped, and the three meter
    // gains, all green), and bring up the RETURN button on it. (The ambient ships sailing
    // out and back never call this — they are flavor, not an ending.)
    function endRound() {
      if (ended) return;
      ended = true;
      if (selectedCont) deselectCont(selectedCont); // drop any lifted container so the count is final
      portFinishMesh.visible = false;
      hintMesh.visible = false;
      clearFact();                           // tidy any mid-fade why-fact so it never sits over the result
      panelMesh.visible = false;             // hide the live SHIPPED manifest; the result's gains replace it
      const a = computeAward();
      sfxFanfare();                          // a warm, celebratory cue (no fail state)
      // The friendly line, by how many they shipped correctly. Every tier is positive.
      let line = PORT.RESULT_WARM;
      if (a.total >= PORT.HAUL_BIG_AT) line = PORT.RESULT_BIG;
      else if (a.total >= PORT.HAUL_MID_AT) line = PORT.RESULT_MID;
      const noun = a.total === 1 ? "container" : "containers";
      const note = line + "  You shipped " + a.total + " " + noun + " to the right markets.";
      const changes = [
        { label: "Economic Impact", delta: a.ei },
        { label: "Innovation Thinking", delta: a.it },
        { label: "Problem Solving", delta: a.ps },
      ];
      // Hand the REAL totals to the shell now; the Return press (handled in tick)
      // runs finishStop -> completeStop("port", pendingAward).
      pendingAward = { economic: a.ei, innovation: a.it, problem: a.ps };
      // TWO beats, because the Port finish area is too busy to show both cards at once:
      // first the THEN AND NOW history card, centered; then, after a hold, the result
      // gains and the Return button. The then-now steps aside when the result appears.
      if (resultMesh) { group.remove(resultMesh); resultMesh = null; }
      if (portThenNow) { group.remove(portThenNow); portThenNow = null; }
      returnMesh.visible = false;
      if (THEN_NOW.port) {
        portThenNow = makeThenNowCard(THEN_NOW.port, PORT.THEN_NOW_W);
        onTop(portThenNow);
        portThenNow.position.set(PORT.THEN_NOW_POS[0], PORT.THEN_NOW_POS[1], PORT.THEN_NOW_POS[2]);
        group.add(portThenNow);
      }
      const token = ++endToken;
      const showResult = function () {
        if (!ended || token !== endToken) return; // the round was reset or left during the hold
        if (portThenNow) { group.remove(portThenNow); portThenNow = null; }
        // The why-framing (PORT.RESULT_WHY) rides UNDER the gains as a calm sub-note, so the
        // result explains WHY each meter grew, not just by how much.
        resultMesh = makeReadoutCard(changes, note, { widthMeters: PORT.RESULT_W, subNote: PORT.RESULT_WHY });
        onTop(resultMesh);
        resultMesh.position.set(PORT.RESULT_POS[0], PORT.RESULT_POS[1], PORT.RESULT_POS[2]);
        group.add(resultMesh);
        returnMesh.visible = true;
        returnMesh.scale.setScalar(1);
        returnWasPressed = !!returnBtn.hasComponent(Pressed); // showing it must not fire on a carried press
      };
      // setTimeout (not rAF) is safe in the headset; the token guards a leave mid-hold.
      if (THEN_NOW.port) setTimeout(showResult, PORT.THEN_NOW_HOLD_MS);
      else showResult();
      console.log("[PORT] round end => award", pendingAward, "from", { ...counts }, "allShips", a.allShips);
    }

    let refillIdx = 0;
    function nextRefillProduct(): string {
      const k = PORT.REFILL_PRODUCTS[refillIdx % PORT.REFILL_PRODUCTS.length];
      refillIdx++;
      return k;
    }
    // Set which PRODUCT a container carries: its market drives the match (ct.key, kept so
    // sh.key === ct.key still decides a correct load) and its painted face shows the
    // product name + icon over the market's backup color. Base color stays white so the
    // texture reads true; the gold/red glow still rides emissive, untouched.
    function recolor(ct: Cont, productName: string) {
      const p = productByName[productName];
      ct.product = productName;
      ct.key = p.market;
      (ct.mesh.material as any).map = texByProduct[productName];
      (ct.mesh.material as any).color.set("#ffffff");
      (ct.mesh.material as any).needsUpdate = true;
    }
    function park(ct: Cont) {              // hide a container far below the world: gone AND untappable
      ct.state = "parked"; ct.dur = 0; ct.tint = 0; ct.timer = 0;
      ct.mesh.scale.setScalar(1);
      (ct.mesh.material as any).emissiveIntensity = 0;
      ct.mesh.visible = false;
      ct.mesh.position.set(0, PORT.PARK_Y, 0);
      ct.wasPressed = false;
      if (selectedCont === ct) selectedCont = null;
    }
    function toSlot(ct: Cont, scaleIn: boolean) { // set a container idle, riding its belt slot
      ct.state = "idle"; ct.dur = 0; ct.tint = 0; ct.timer = 0;
      ct.appearT = scaleIn ? 0 : PORT.ENTER_MS;   // scaleIn => grow back in (a fresh / refilled cube), else already full
      (ct.mesh.material as any).emissiveIntensity = 0;
      ct.mesh.position.set(slotX(ct.slot), PORT.BELT_Y, PORT.BELT_Z);
      ct.mesh.scale.setScalar(scaleIn ? 0.001 : 1); // tick recomputes the real scale from slotScale * appear
      ct.mesh.visible = true;
      ct.wasPressed = !!ct.entity.hasComponent(Pressed); // never fire on a carried-over press
    }
    function startReturn(ct: Cont) {       // ease a container back to its (moving) belt slot
      const wp = new Vector3(); ct.mesh.getWorldPosition(wp);
      ct.fx = wp.x; ct.fy = wp.y; ct.fz = wp.z;
      ct.t = 0; ct.dur = PORT.RETURN_MS; ct.state = "returning";
    }

    // ---- TAP TO SELECT ----  Lift the chosen container and give it the warm gold glow so
    // it clearly stands out. Only one container is ever selected; choosing a new one drops
    // the old one back to the belt first. heldX freezes its x so a lifted cube holds still
    // (it does not drift along with the belt while you aim).
    function selectCont(ct: Cont) {
      if (selectedCont && selectedCont !== ct) deselectCont(selectedCont);
      selectedCont = ct;
      ct.heldX = slotX(ct.slot);           // freeze x at the spot it was picked up
      ct.state = "selected";
      ct.mesh.scale.setScalar(1);          // a picked cube is always full size, clear of the belt-end fade
      (ct.mesh.material as any).emissive.set(PORT.SELECT_GLOW); // warm gold while chosen (lift + glow in tick)
      sfxClick();                          // a soft tap to confirm the pick
    }
    function deselectCont(ct: Cont) {      // let it go: ease it back onto the moving belt, glow off
      if (selectedCont === ct) selectedCont = null;
      (ct.mesh.material as any).emissive.set(PORT.WRONG_GLOW);  // restore the red the wrong-ship blink uses
      ct.tint = 0;                          // a plain deselect has no red blink
      startReturn(ct);                      // smooth ease back to its slot (the belt has moved on)
      sfxClick();
    }

    // ---- TAP A SHIP ----  Send the selected container on a smooth arc to that ship's deck.
    // Only one is ever in flight; the actual match is decided on arrival (onArrive).
    function sendToShip(sh: any) {
      const ct = selectedCont;
      if (!ct || flyingCont) return;       // need a selection, and only one container in flight
      selectedCont = null;
      const wp = new Vector3(); ct.mesh.getWorldPosition(wp);
      ct.fx = wp.x; ct.fy = wp.y; ct.fz = wp.z;                 // arc START (its lifted spot)
      ct.tx = sh.x; ct.ty = PORT.DECK_Y + PORT.CONTAINER / 2; ct.tz = sh.z; // arc END (the deck)
      ct.targetShip = sh;
      ct.t = 0; ct.dur = PORT.FLIGHT_MS; ct.state = "flying";
      (ct.mesh.material as any).emissive.set(PORT.WRONG_GLOW);  // selection glow off; red ready if it is wrong
      (ct.mesh.material as any).emissiveIntensity = 0;
      ct.mesh.scale.setScalar(1);
      flyingCont = ct;
    }

    // ---- ARRIVAL ----  The flying container reached its ship: this is the KEPT match-and-
    // count logic, now matching on MARKET. Correct (the product's market is the ship's
    // market) => it loads (chime, the ship glows gold, its count goes up, and a fresh
    // product refills the slot shortly). Wrong market => a soft click + a red blink and it
    // flies back to its slot, no penalty. Either way the game is ready for the next tap.
    function onArrive(ct: Cont) {
      const sh = ct.targetShip;
      flyingCont = null;
      ct.targetShip = null;
      if (sh && sh.key === ct.key) {       // ct.key is the product's market; match it to the ship's market
        sfxChime();                        // a clear, happy "loaded!"
        counts[ct.key] = (counts[ct.key] || 0) + 1;
        sh.pulse = 1;                      // the ship glows gold, eased down in tick
        drawCounts();
        const pa = computeAward();         // feed the in-stop meter so its bars grow with each load
        stopPreview.economic = pa.ei; stopPreview.innovation = pa.it; stopPreview.problem = pa.ps;
        showFact(ct.product);              // the teaching layer: a brief why-fact for this product
        park(ct);                          // it snaps aboard and is gone from the dock...
        ct.state = "loaded"; ct.timer = PORT.REFILL_MS; // ...and a fresh one refills the slot shortly
        console.log("[PORT] loaded " + ct.product + " => " + ct.key + " totals", { ...counts });
      } else {
        sfxClick();                        // a soft, gentle "not that market"
        ct.tint = 1;                       // a brief red blink, eased down in tick
        startReturn(ct);                   // and it flies back to its slot, no penalty
        console.log("[PORT] wrong market: " + ct.product + " (" + ct.key + ") over " + (sh ? sh.key : "?"));
      }
    }

    function tick() {
      // THE WHY-FACT FADE (teaching layer): ease the fact card in, hold it, then ease it
      // out, all on the material opacity so nothing flashes and it clears itself without a
      // tap. setInterval-driven like every other loop. When done, it hides and frees play.
      if (factActive) {
        factT += PORT.TICK_MS;
        const inMs = PORT.FACT_IN_MS, hold = PORT.FACT_HOLD_MS, out = PORT.FACT_OUT_MS;
        let a: number;
        if (factT < inMs) a = factT / inMs;                                  // ease in
        else if (factT < inMs + hold) a = 1;                                  // hold to read
        else if (factT < inMs + hold + out) a = 1 - (factT - inMs - hold) / out; // ease out
        else { a = 0; factActive = false; factMesh.visible = false; }
        (factMesh.material as any).opacity = Math.max(0, Math.min(1, a));
      }

      // Advance the CONVEYOR a little (slow + calm) and scroll the chevron surface to
      // match, so the belt always reads as quietly running. setInterval-driven, not rAF.
      const beltAdvance = PORT.BELT_SPEED * (PORT.TICK_MS / 1000);
      beltOffset = (beltOffset + beltAdvance) % BELT_LEN;
      chevTex.offset.x -= (beltAdvance * PORT.BELT_CHEVRON_REPEAT) / beltFullLen; // chevrons drift with the belt

      // SHIPS: a gentle bob, then the departure cycle (docked -> sailing out -> a fresh
      // same-destination ship arriving -> docked). The dock timer only counts during live
      // play, so nothing sails before Start or after the round ends; an in-progress sail
      // always finishes smoothly. A ship never departs while a container is inbound to it.
      for (const sh of ships) {
        sh.group.position.y = Math.sin(portClock * 0.001 * Math.PI * 2 * PORT.BOB_HZ + sh.x) * PORT.BOB_AMP;
        if (sh.state === "docked") {
          sh.group.position.z = sh.z;
          sh.group.scale.setScalar(1);
          sh.group.visible = true;
          sh.padMesh.visible = true;                 // loadable while docked
          if (portStarted && !ended) {
            const inbound = !!flyingCont && flyingCont.targetShip === sh;
            sh.dockTimer -= PORT.TICK_MS;
            if (sh.dockTimer <= 0 && !inbound) {
              sh.state = "sailing"; sh.sailT = 0; sh.pulse = 0;
              sh.padMesh.visible = false;
              sfxShipHorn();                          // a soft horn as she pulls away
            }
          }
          if (sh.pulse > 0) {                         // the gold "loaded!" pulse easing away
            sh.pulse = Math.max(0, sh.pulse - PORT.PULSE_FALL);
            (sh.hull.material as any).emissiveIntensity = sh.pulse * 0.7;
          } else {                                    // else a faint hover glow when aimed at
            const hov = !!selectedCont && !flyingCont && !!sh.pad.hasComponent(Hovered);
            (sh.hull.material as any).emissiveIntensity = hov ? PORT.SHIP_HOVER_GLOW : 0;
          }
        } else if (sh.state === "sailing") {          // smooth ease-OUT to sea, shrinking away
          sh.sailT = Math.min(PORT.SAIL_MS, sh.sailT + PORT.TICK_MS);
          const p = sh.sailT / PORT.SAIL_MS;
          const e = p * p;                            // ease-in: accelerates away
          sh.group.position.z = sh.z + (PORT.SAIL_OUT_Z - sh.z) * e;
          sh.group.scale.setScalar(1 + (PORT.SAIL_OUT_SCALE - 1) * e);
          (sh.hull.material as any).emissiveIntensity = 0;
          sh.padMesh.visible = false;
          if (sh.sailT >= PORT.SAIL_MS) { sh.state = "arriving"; sh.sailT = 0; }
        } else if (sh.state === "arriving") {         // a fresh ship eases IN to the berth, growing
          sh.sailT = Math.min(PORT.ARRIVE_MS, sh.sailT + PORT.TICK_MS);
          const p = sh.sailT / PORT.ARRIVE_MS;
          const e = 1 - Math.pow(1 - p, 2);           // ease-out: decelerates into the berth
          sh.group.position.z = PORT.SAIL_OUT_Z + (sh.z - PORT.SAIL_OUT_Z) * e;
          sh.group.scale.setScalar(PORT.SAIL_OUT_SCALE + (1 - PORT.SAIL_OUT_SCALE) * e);
          sh.padMesh.visible = false;
          if (sh.sailT >= PORT.ARRIVE_MS) {
            sh.state = "docked"; sh.dockTimer = PORT.DOCK_MS;
            sh.group.position.z = sh.z; sh.group.scale.setScalar(1);
            sh.padMesh.visible = true;
          }
        }

        // ---- WHOLE-SHIP TAP TARGET gating ----  The big invisible pad is a live ray target
        // ONLY while the student is holding a container AND this berth is docked. Any other
        // time it leaves the ray set, so an idle aim drops THROUGH it to the Finish button
        // behind the green berth, a sailed-out berth is never a target, and nothing lingers
        // between loads. Flip on a real change only, so there is no per-frame component churn.
        const wantLive = portStarted && !ended && !!selectedCont && !flyingCont && sh.state === "docked";
        if (wantLive !== sh.padLive) {
          sh.padLive = wantLive;
          if (wantLive) sh.pad.addComponent(Interactable);
          else sh.pad.removeComponent(Interactable);
          sh.padWasPressed = false;                 // re-arm: never fire on a carried-over press
        }
      }
      for (const ct of conts) {
        if (ct.state === "flying") {
          // a smooth up-and-over arc to the ship deck. setInterval-driven (rAF pauses in
          // the headset); locked upright, so only the position moves.
          ct.t = Math.min(ct.dur, ct.t + PORT.TICK_MS);
          const k = ct.dur > 0 ? ct.t / ct.dur : 1;
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOut along the path
          const arc = Math.sin(Math.PI * k) * PORT.FLIGHT_ARC;            // 0 at both ends, peak mid-flight
          ct.mesh.position.set(
            ct.fx + (ct.tx - ct.fx) * e,
            ct.fy + (ct.ty - ct.fy) * e + arc,
            ct.fz + (ct.tz - ct.fz) * e,
          );
          if (ct.t >= ct.dur) onArrive(ct);
          continue; // a flying container does nothing else this tick
        }
        if (ct.state === "returning") {
          // ease back to the container's belt slot, which is itself slowly moving; home to
          // the slot's CURRENT spot each tick so it lands cleanly on the belt.
          ct.t = Math.min(ct.dur, ct.t + PORT.TICK_MS);
          const k = ct.dur > 0 ? ct.t / ct.dur : 1;
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOut
          const tx = slotX(ct.slot), ty = PORT.BELT_Y, tz = PORT.BELT_Z;
          ct.mesh.position.set(ct.fx + (tx - ct.fx) * e, ct.fy + (ty - ct.fy) * e, ct.fz + (tz - ct.fz) * e);
          ct.mesh.scale.setScalar(1); // full size while flying home, clear of the belt-end fade
          if (ct.tint > 0) { // the red "wrong ship" blink fades as it flies home
            ct.tint = Math.max(0, ct.tint - PORT.TINT_FALL);
            (ct.mesh.material as any).emissiveIntensity = ct.tint * 0.85;
          }
          if (ct.t >= ct.dur) toSlot(ct, false);
          continue;
        }
        if (ct.state === "selected") {
          // lift it (held still at heldX, so it does not drift with the belt) with a tiny,
          // calm hover, and breathe the gold glow so it is unmistakably the chosen one.
          const phase = portClock * 0.001 * Math.PI * 2 * PORT.SELECT_HOVER_HZ;
          ct.mesh.position.set(ct.heldX, PORT.BELT_Y + PORT.SELECT_LIFT + Math.sin(phase) * PORT.SELECT_HOVER_AMP, PORT.BELT_Z);
          const g = 0.5 + 0.5 * Math.sin(phase);
          (ct.mesh.material as any).emissiveIntensity =
            PORT.SELECT_GLOW_MIN + (PORT.SELECT_GLOW_MAX - PORT.SELECT_GLOW_MIN) * g;
          ct.mesh.scale.setScalar(1);
          continue;
        }
        if (ct.state === "loaded" && ct.timer > 0) {
          ct.timer -= PORT.TICK_MS;
          if (ct.timer <= 0) { recolor(ct, nextRefillProduct()); toSlot(ct, true); } // a fresh product rejoins the belt, scaling in
          continue;
        }
        if (ct.state === "idle") {
          // RIDE the belt slot. scale carries the belt-end fade (slotScale: 0 at the ends,
          // 1 across the reachable middle) and any scale-in (appear), times a gentle hover-
          // grow while the ray rests on it during live play.
          if (ct.appearT < PORT.ENTER_MS) ct.appearT = Math.min(PORT.ENTER_MS, ct.appearT + PORT.TICK_MS);
          const appear = smoothstep(ct.appearT / PORT.ENTER_MS);
          const sc = slotScale(ct.slot);
          const hov = portStarted && !ended && sc >= PORT.BELT_TAP_MIN_SCALE && !flyingCont && !!ct.entity.hasComponent(Hovered);
          ct.mesh.position.set(slotX(ct.slot), PORT.BELT_Y, PORT.BELT_Z);
          ct.mesh.scale.setScalar(sc * appear * (hov ? PORT.HOVER_SCALE : 1));
        }
      }

      // ---- TAP EDGE-DETECTION ----  fire once on a FRESH Pressed edge, the same way the
      // landmarks and choice cards read a select (a held trigger never re-fires). Three
      // states: the intro is up (only Start reacts), live play (containers/ships/catcher +
      // the FINISH round-ender react), or ended (the result is up, so only the RETURN button
      // reacts). Tapping an idle container selects it; tapping the selected one again
      // deselects it; a ship sends the selection; empty water (the catcher) deselects. One
      // at a time.
      if (!portStarted) {
        // Intro is up: a fresh press of the Start button begins play and clears the intro.
        const hov = !!startBtn.hasComponent(Hovered);
        const prs = !!startBtn.hasComponent(Pressed);
        startBtnMesh.scale.setScalar(prs ? VISIT.BTN_PRESS_SCALE : (hov ? VISIT.BTN_HOVER_SCALE : 1));
        if (prs && !startWasPressed) beginPlay();
        startWasPressed = prs;
      } else if (!ended) {
        for (const ct of conts) {
          // an idle container is only tappable once it has scaled in past the belt ends
          // (so a barely-there cube at the seam is never the thing you grab); a selected
          // one is always tappable (tap it again to let it go).
          const tappable = (ct.state === "idle" && slotScale(ct.slot) >= PORT.BELT_TAP_MIN_SCALE) || ct.state === "selected";
          const prs = tappable && !flyingCont && !!ct.entity.hasComponent(Pressed);
          if (prs && !ct.wasPressed) {
            if (ct.state === "selected") deselectCont(ct); // tap the chosen one again => let it go
            else selectCont(ct);                           // tap an idle one => choose it
          }
          ct.wasPressed = prs;
        }
        for (const sh of ships) {
          const prs = !!sh.pad.hasComponent(Pressed);
          if (prs && !sh.padWasPressed && selectedCont && !flyingCont) sendToShip(sh);
          sh.padWasPressed = prs;
        }
        const cprs = !!catchEntity.hasComponent(Pressed);
        if (cprs && !catchWasPressed && selectedCont && !flyingCont) deselectCont(selectedCont);
        catchWasPressed = cprs;

        // The FINISH round-ender: gentle grow/squish, and a fresh press (never mid-flight,
        // so the count is settled) ends the round and shows the result.
        const fhov = !!portFinishBtn.hasComponent(Hovered);
        const fprs = !!portFinishBtn.hasComponent(Pressed);
        portFinishMesh.scale.setScalar(fprs ? VISIT.BTN_PRESS_SCALE : (fhov ? VISIT.BTN_HOVER_SCALE : 1));
        if (fprs && !portFinishWasPressed && !flyingCont) endRound();
        portFinishWasPressed = fprs;

        // Keep the following hint in step with the state: pick a container, then send it to
        // its match. Reword only when it actually changes, so nothing flashes.
        const want = selectedCont ? "ship" : "pick";
        if (want !== hintState) {
          hintState = want;
          drawHint(want === "ship" ? "Now send it to the ship that wants it" : "Tap a product to pick it up");
        }
        hintMesh.visible = !factActive && !ended;  // the why-fact briefly takes the centre; the hint returns as it fades (and a FINISH press this same tick keeps it hidden under the result)
      } else {
        // The result is up: a fresh press of RETURN lands the score (finishStop ->
        // completeStop with the real pendingAward) and fades back to the map.
        const rhov = !!returnBtn.hasComponent(Hovered);
        const rprs = !!returnBtn.hasComponent(Pressed);
        returnMesh.scale.setScalar(rprs ? VISIT.BTN_PRESS_SCALE : (rhov ? VISIT.BTN_HOVER_SCALE : 1));
        if (rprs && !returnWasPressed) finishStop();
        returnWasPressed = rprs;
      }
    }

    function start() {
      portClock = 0; refillIdx = 0; beltOffset = 0;
      counts.europe = 0; counts.asia = 0; counts.usa = 0;
      drawCounts();
      panelMesh.visible = true;                  // the SHIPPED manifest is back for a fresh round
      clearFact();                               // no leftover why-fact from a prior visit
      ended = false; portFinishWasPressed = false; returnWasPressed = false; // a fresh round, no result yet
      portFinishMesh.visible = false;            // FINISH appears only once play starts (beginPlay)
      returnMesh.visible = false;                // RETURN appears only with the result (endRound)
      if (resultMesh) { group.remove(resultMesh); resultMesh = null; } // clear any prior round's result
      if (portThenNow) { group.remove(portThenNow); portThenNow = null; } // and its then-now card
      selectedCont = null; flyingCont = null; catchWasPressed = false;
      catchMesh.visible = true;                  // the empty-water deselect catcher is live in the port
      for (let i = 0; i < ships.length; i++) {
        const sh = ships[i];
        sh.pulse = 0; sh.group.position.set(sh.x, 0, sh.z); sh.group.scale.setScalar(1);
        sh.group.visible = true; (sh.hull.material as any).emissiveIntensity = 0;
        sh.state = "docked"; sh.sailT = 0;
        sh.dockTimer = PORT.DOCK_MS_FIRST + i * PORT.DOCK_STAGGER; // staggered first departures
        sh.padWasPressed = false;
        sh.padMesh.visible = true;               // ship tap-pads are tappable only inside the port
      }
      for (let i = 0; i < conts.length; i++) {
        const ct = conts[i];
        ct.slot = i;
        (ct.mesh.material as any).emissive.set(PORT.WRONG_GLOW); // clear any leftover gold selection glow
        recolor(ct, PORT.START_PRODUCTS[i % PORT.START_PRODUCTS.length]);
        toSlot(ct, true);                        // the supply scales in onto the moving belt
      }
      showIntro();                               // greet the student with the directions; Start begins play
    }
    function stop() {
      for (const ct of conts) park(ct); // hidden + unreachable, so nothing leaks back to the hub
      clearFact();                       // park the why-fact so nothing lingers into the hub
      selectedCont = null; flyingCont = null;
      catchMesh.visible = false;                 // park the catcher so it never blocks the hub
      for (const sh of ships) {
        sh.padWasPressed = false; sh.padMesh.visible = false;
        if (sh.pad.hasComponent(Interactable)) sh.pad.removeComponent(Interactable); // leave the ray set so the pad never lingers in the hub
        sh.padLive = false;
        sh.state = "docked"; sh.group.position.set(sh.x, 0, sh.z); sh.group.scale.setScalar(1); sh.group.visible = true;
      }
      portStarted = false; startWasPressed = false; // tidy the directions so nothing leaks to the hub
      ended = false; portFinishWasPressed = false; returnWasPressed = false;
      introPanel.visible = false; startBtnMesh.visible = false; hintMesh.visible = false;
      portFinishMesh.visible = false; returnMesh.visible = false; // park FINISH + RETURN so nothing leaks to the hub
      endToken++;                                // cancel any pending delayed result reveal
      if (resultMesh) { group.remove(resultMesh); resultMesh = null; }
      if (portThenNow) { group.remove(portThenNow); portThenNow = null; }
    }

    // The game's own loop: bob, eases, refill timers, and release detection. Gated so
    // it is idle unless the student is actually standing in the port. setInterval, not
    // rAF (which pauses in the headset), like every other loop in the build.
    setInterval(function () {
      if (currentView !== "stop" || activeStopId !== "port") return;
      portClock += PORT.TICK_MS;
      tick();
    }, PORT.TICK_MS);

    return { group, start, stop, tick };
  }

  registerStopScene("port", buildPortScene()); // the Norfolk dock + harbor water
  portGame = buildPortGame();
  stopScenes["port"].add(portGame.group);       // ships + debug panel hide with the scene

  // One shared loop animates whichever stop's staging is active. setInterval, not
  // rAF (which pauses in the headset). Idle on the hub, where nothing is built.
  let stagingClock = 0;
  setInterval(function () {
    stagingClock += STAGING.TICK_MS;
    if (currentView === "hub") return;
    const st = activeStopId ? stopStagings[activeStopId] : null;
    if (st) st.tick(stagingClock);
  }, STAGING.TICK_MS);

  // ---- The runner's own pressables: a small fixed POOL reused across decisions,
  // so we never churn ray-target entities. Each is a flat card/button wrapped in an
  // Interactable, hidden until a beat enables it; one loop edge-detects a fresh
  // press and adds the grow/squish feedback. Hidden interactables are skipped by
  // the existing hit-test guard, and we also gate on currentView + an enabled flag,
  // so a stray ray can never fire the wrong beat. ----
  type Pressable = {
    entity: any;
    mesh: any;
    enabled: boolean;
    wasPressed: boolean;
    onPress: (() => void) | null;
    card?: { setLabel: (l: string, a?: string) => void };
  };

  const runnerHolder = new Group();
  scene.add(runnerHolder);
  runnerHolder.visible = false;
  let runnerPanelMesh: any = null;

  // Swap in the beat's panel (setup / question / readout / closing). The plain
  // panel meshes live in runnerHolder; the pressables below are their own entities.
  function setRunnerPanel(mesh: any, pos: [number, number, number]) {
    if (runnerPanelMesh) runnerHolder.remove(runnerPanelMesh);
    runnerOnTop(mesh);
    mesh.position.set(pos[0], pos[1], pos[2]);
    runnerHolder.add(mesh);
    runnerPanelMesh = mesh;
  }

  function makePressable(mesh: any): Pressable {
    runnerOnTop(mesh);
    const entity = world.createTransformEntity(mesh).addComponent(Interactable);
    if (entity.object3D) entity.object3D.visible = false;
    return { entity, mesh, enabled: false, wasPressed: false, onPress: null };
  }

  function enablePressable(p: Pressable, onPress: () => void) {
    p.onPress = onPress;
    p.enabled = true;
    p.mesh.scale.setScalar(1);
    if (p.entity.object3D) p.entity.object3D.visible = true;
    p.wasPressed = !!p.entity.hasComponent(Pressed); // re-arm: never fire on a carried-over press
  }
  function disablePressable(p: Pressable) {
    p.enabled = false;
    p.onPress = null;
    p.wasPressed = false;
    p.mesh.scale.setScalar(1);
    if (p.entity.object3D) p.entity.object3D.visible = false;
  }

  // The three reusable option cards, plus the Start and Next buttons.
  const choiceCards: Pressable[] = [];
  for (let i = 0; i < 3; i++) {
    const card = makeChoiceCard(RUNNER.CARD_W, RUNNER.CARD_H);
    const p = makePressable(card.mesh);
    p.card = card;
    choiceCards.push(p);
  }
  const startBtn = makePressable(makeButtonCard("Start", RUNNER.BTN_W, RUNNER.BTN_H));
  const nextBtn = makePressable(makeButtonCard("Next", RUNNER.BTN_W, RUNNER.BTN_H));
  startBtn.entity.object3D!.position.set(RUNNER.BTN_POS[0], RUNNER.BTN_POS[1], RUNNER.BTN_POS[2]);
  nextBtn.entity.object3D!.position.set(RUNNER.BTN_POS[0], RUNNER.BTN_POS[1], RUNNER.BTN_POS[2]);

  // ---- Runner state for the current stop ----
  let runnerPack: DecisionPack | null = null;
  let runnerStop: any = null;
  let runnerIndex = 0;
  const runnerTally = { ei: 0, it: 0, ps: 0 };
  // The readout's "read it first" beat: while this counts down (in TICK_MS steps),
  // the readout is up and the Next button is hidden; at zero the Next action appears.
  let readoutHoldTicks = 0;
  let pendingNextAction: (() => void) | null = null;

  // Clear every runner pressable + panel (used on hideStop / between visits).
  function hideRunner() {
    runnerHolder.visible = false;
    if (runnerPanelMesh) { runnerHolder.remove(runnerPanelMesh); runnerPanelMesh = null; }
    readoutHoldTicks = 0;
    pendingNextAction = null;
    for (const c of choiceCards) disablePressable(c);
    disablePressable(startBtn);
    disablePressable(nextBtn);
  }

  // Beat 1: the setup line (Fox's framing) + a Start button.
  function beatSetup() {
    setRunnerPanel(makeTextPanel(runnerStop.name, runnerPack!.setup, RUNNER.INFO_W), RUNNER.SETUP_PANEL_POS);
    for (const c of choiceCards) disablePressable(c);
    disablePressable(nextBtn);
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    enablePressable(startBtn, function () { sfxClick(); beatDecision(0); });
    runnerHolder.visible = true;
  }

  // Beat 2: one decision — the question up top, three option cards below.
  function beatDecision(i: number) {
    runnerIndex = i;
    const d = runnerPack!.decisions[i];
    const n = runnerPack!.decisions.length;
    setRunnerPanel(makeInfoCard("Choice " + (i + 1) + " of " + n, d.question, RUNNER.Q_W), RUNNER.Q_PANEL_POS);
    disablePressable(startBtn);
    disablePressable(nextBtn);
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    for (let k = 0; k < choiceCards.length; k++) {
      const opt = d.options[k];
      const p = choiceCards[k];
      p.card!.setLabel(opt.label, runnerStop.color);
      p.entity.object3D!.position.set(RUNNER.CARD_X, RUNNER.CARD_TOP_Y - k * RUNNER.CARD_STEP, RUNNER.CARD_Z);
      enablePressable(p, function () { onPick(opt, k); });
    }
    runnerHolder.visible = true;
  }

  // A pick: add its effects to this stop's running tally, then show the readout.
  function onPick(opt: DecisionOption, optionIndex: number) {
    sfxClick();                                                  // soft click on every pick
    if ((opt.reaction || "neutral") === "thrive") sfxChime();    // a pleasant chime for a strong pick
    runnerTally.ei += opt.effects.ei;
    runnerTally.it += opt.effects.it;
    runnerTally.ps += opt.effects.ps;
    // Feed the in-stop meter so its bars move with this pick (not just at the hub).
    stopPreview.economic = runnerTally.ei; stopPreview.innovation = runnerTally.it; stopPreview.problem = runnerTally.ps;
    // Assemble the matching build piece in the scene and let it react to this pick.
    // (The meter math above and the color-coded readout below are unchanged.)
    const staging = runnerStop ? stopStagings[runnerStop.id] : null;
    if (staging) staging.addStage(runnerIndex, optionIndex, opt.reaction || "neutral");
    console.log("[RUNNER] picked:", opt.label, opt.effects, opt.reaction, "=> stop tally", { ...runnerTally });
    beatReadout(opt);
  }

  // Beat 3: the polished VISIBLE-CONSEQUENCES readout (Module 8's look) — the pick's
  // effect on each meter, green for a gain and red for a drop, unchanged meters left
  // out, with the result note beneath it for the "why". The readout stays up a beat
  // so the student reads it; THEN the Next button appears (revealed by the runner's
  // setInterval loop via readoutHoldTicks). Next advances to the next decision or
  // the finish. The decision data, the tally, and completeStop are untouched.
  function beatReadout(opt: DecisionOption) {
    for (const c of choiceCards) disablePressable(c);
    disablePressable(startBtn);
    disablePressable(nextBtn); // hidden until the readout has been up long enough to read
    const changes = [
      { label: "Economic Impact", delta: opt.effects.ei },
      { label: "Innovation Thinking", delta: opt.effects.it },
      { label: "Problem Solving", delta: opt.effects.ps },
    ];
    setRunnerPanel(makeReadoutCard(changes, opt.note, { widthMeters: RUNNER.READOUT_W }), RUNNER.READOUT_PANEL_POS);
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    // Queue the Next action; the service loop reveals the button after the hold.
    const last = runnerIndex >= runnerPack!.decisions.length - 1;
    pendingNextAction = function () {
      sfxClick();
      if (last) beatFinish();
      else beatDecision(runnerIndex + 1);
    };
    readoutHoldTicks = Math.ceil(RUNNER.READOUT_HOLD_MS / RUNNER.TICK_MS);
    runnerHolder.visible = true;
  }

  // Beat 4: after the last decision — a wrap-up line and the shell's EXISTING
  // Finish button, now carrying the student's real tally (not the placeholder).
  function beatFinish() {
    for (const c of choiceCards) disablePressable(c);
    disablePressable(startBtn);
    disablePressable(nextBtn);
    // Wrap-up = the stop's THEN AND NOW card (the module's history through-line):
    // a short then-vs-now fact before the Finish button. The runner is shared by
    // every decision stop, so the fact is looked up by stop id (a generic "All
    // set!" line is the fallback if a stop has no then-now entry).
    const thenNow = THEN_NOW[runnerStop.id];
    setRunnerPanel(
      thenNow
        ? makeThenNowCard(thenNow, RUNNER.INFO_W)
        : makeTextPanel("All set!", "You made all three choices. Press the button to return to the map.", RUNNER.INFO_W),
      RUNNER.CLOSE_PANEL_POS,
    );
    // Hand the real totals to the shell; finishStop reads pendingAward.
    pendingAward = { economic: runnerTally.ei, innovation: runnerTally.it, problem: runnerTally.ps };
    console.log("[RUNNER] finished " + runnerStop.id + " => award", pendingAward);
    finishWasPressed = true; // require a fresh press, so revealing the button never auto-fires
    if (finishBtn.object3D) finishBtn.object3D.visible = true;
    runnerHolder.visible = true;
  }

  // Start a pack for a stop: reset the tally and show the setup beat.
  function startDecisionPack(stop: any, pack: DecisionPack) {
    runnerStop = stop;
    runnerPack = pack;
    runnerIndex = 0;
    runnerTally.ei = 0;
    runnerTally.it = 0;
    runnerTally.ps = 0;
    readoutHoldTicks = 0;
    pendingNextAction = null;
    const staging = stopStagings[stop.id]; // clear any pieces left from a prior visit
    if (staging) staging.reset();
    beatSetup();
  }

  // One loop services every runner pressable: grow on hover, squish on press, and
  // fire a fresh press once. It also runs the readout's "read it first" countdown,
  // revealing the Next button once the hold elapses. Gated on currentView + each
  // pressable's enabled flag. setInterval (rAF pauses in the headset).
  setInterval(function () {
    const live = currentView === "stop";
    // Readout hold: count down, then reveal the queued Next action as a clear button.
    if (live && readoutHoldTicks > 0) {
      readoutHoldTicks -= 1;
      if (readoutHoldTicks === 0 && pendingNextAction) {
        enablePressable(nextBtn, pendingNextAction);
        pendingNextAction = null;
      }
    }
    const all = [startBtn, nextBtn, choiceCards[0], choiceCards[1], choiceCards[2]];
    for (const p of all) {
      if (!live || !p.enabled) {
        p.mesh.scale.setScalar(1);
        p.wasPressed = false;
        continue;
      }
      const hov = !!p.entity.hasComponent(Hovered);
      const prs = !!p.entity.hasComponent(Pressed);
      p.mesh.scale.setScalar(prs ? RUNNER.PRESS_SCALE : hov ? RUNNER.HOVER_SCALE : 1);
      if (prs && !p.wasPressed && p.onPress) p.onPress();
      p.wasPressed = prs;
    }
  }, RUNNER.TICK_MS);

  // ======================================================================
  // HUB METERS PANEL  —  a fixed card in the upper-left of the map showing the
  // three running totals as filling bars, in the SAME colors as the end report
  // (ui/hub-meters.uikitml mirrors ui/report.uikitml's bars). It reads the live
  // m6Totals the report uses, so the bars fill as stops finish, and sit empty
  // when nothing is done. It rides with the hub (mirrors hubGroup.visible) so it
  // hides inside a stop, without touching the visit loop. setInterval only.
  // ======================================================================
  const HUB_METERS = {
    POS: [-1.7, 2.5, 4.4] as [number, number, number], // upper-left, above Fox's bubble
    YAW: 0.58,           // radians; turns the card to face the student (about 33 deg)
    MAXW: 1.0,           // panel physical width (metres)
    MAXH: 0.8,           // panel physical height (metres)
    TRACK: 68,           // must match the .track width in ui/hub-meters.uikitml
    EASE: 0.16,          // how fast each bar eases toward its total each tick
    TICK_MS: 33,         // loop rate (rAF pauses in the headset)
  };
  const hubMetersPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/hub-meters.json", maxWidth: HUB_METERS.MAXW, maxHeight: HUB_METERS.MAXH });
  hubMetersPanel.object3D!.position.set(HUB_METERS.POS[0], HUB_METERS.POS[1], HUB_METERS.POS[2]);
  hubMetersPanel.object3D!.rotation.set(0, HUB_METERS.YAW, 0, "YXZ"); // turn to face the student

  let hubMetersDoc: any = null;
  whenPanelReady(hubMetersPanel, function (doc) { hubMetersDoc = doc; });

  // Eased display values, so a finished stop visibly FILLS its bar rather than
  // snapping. We only push a bar when its rounded number actually changed.
  const hubShown = { economic: 0, innovation: 0, problem: 0 };
  const hubLast = { economic: -1, innovation: -1, problem: -1 };
  function pushHubMeter(key: "economic" | "innovation" | "problem", fillId: string, valId: string) {
    const rounded = Math.round(hubShown[key]);
    if (rounded === hubLast[key]) return;
    hubLast[key] = rounded;
    const f = hubMetersDoc.getElementById(fillId);
    if (f) f.setProperties({ width: (HUB_METERS.TRACK * hubShown[key]) / 100 });
    const v = hubMetersDoc.getElementById(valId);
    if (v) v.setProperties({ text: String(rounded) });
  }
  setInterval(function () {
    // Ride with the hub: shown on the map, hidden inside a stop. Mirroring
    // hubGroup.visible means the swap happens under the fade cover, so no pop.
    const onMap = hubGroup.visible;
    if (hubMetersPanel.object3D) hubMetersPanel.object3D.visible = onMap;
    if (!hubMetersDoc || !onMap) return; // only animate while the map is in view
    let k: "economic" | "innovation" | "problem";
    for (k of ["economic", "innovation", "problem"] as const) {
      const target = m6Totals[k];
      if (Math.abs(target - hubShown[k]) < 0.5) hubShown[k] = target; // settle exactly
      else hubShown[k] += (target - hubShown[k]) * HUB_METERS.EASE;
    }
    pushHubMeter("economic", "hub-fill-economic", "hub-val-economic");
    pushHubMeter("innovation", "hub-fill-innovation", "hub-val-innovation");
    pushHubMeter("problem", "hub-fill-problem", "hub-val-problem");
  }, HUB_METERS.TICK_MS);

  // ======================================================================
  // IN-STOP RUNNING METERS  —  the same three-bar panel, shown INSIDE a stop so
  // the student sees their totals fill as they play, not only back at the map.
  // It reads previewTotals() (committed award from the other stops + this stop's
  // live in-progress contribution), so a pick or a correct load visibly moves the
  // bars. It reuses ui/hub-meters.json (a second document; ids are scoped per
  // panel), sits off to the upper LEFT at kid height so it never covers the
  // question, cards, buttons, or the Port play area, and rides currentView.
  // setInterval only (rAF pauses in the headset).
  // ======================================================================
  const IN_STOP_METERS = {
    POS: [-1.72, 2.34, 3.55] as [number, number, number], // upper-left, clear of the centered panels
    YAW: 0.5,            // radians; turn the card to face the student
    MAXW: 0.9, MAXH: 0.72,
    TRACK: 68,           // must match the .track width in ui/hub-meters.uikitml
    EASE: 0.18,          // eases toward the live target each tick
    TICK_MS: 33,
  };
  const inStopPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/hub-meters.json", maxWidth: IN_STOP_METERS.MAXW, maxHeight: IN_STOP_METERS.MAXH });
  inStopPanel.object3D!.position.set(IN_STOP_METERS.POS[0], IN_STOP_METERS.POS[1], IN_STOP_METERS.POS[2]);
  inStopPanel.object3D!.rotation.set(0, IN_STOP_METERS.YAW, 0, "YXZ");
  inStopPanel.object3D!.visible = false;
  let inStopDoc: any = null;
  whenPanelReady(inStopPanel, function (doc) { inStopDoc = doc; });

  const inStopShown = { economic: 0, innovation: 0, problem: 0 };
  const inStopLast = { economic: -1, innovation: -1, problem: -1 };
  function pushInStopMeter(key: "economic" | "innovation" | "problem", fillId: string, valId: string) {
    const rounded = Math.round(inStopShown[key]);
    if (rounded === inStopLast[key]) return;
    inStopLast[key] = rounded;
    const f = inStopDoc.getElementById(fillId);
    if (f) f.setProperties({ width: (IN_STOP_METERS.TRACK * inStopShown[key]) / 100 });
    const v = inStopDoc.getElementById(valId);
    if (v) v.setProperties({ text: String(rounded) });
  }
  setInterval(function () {
    const inStop = currentView === "stop";
    if (inStopPanel.object3D) inStopPanel.object3D.visible = inStop;
    if (!inStopDoc || !inStop) return;   // only animate while standing in a stop
    const target = previewTotals();
    let k: "economic" | "innovation" | "problem";
    for (k of ["economic", "innovation", "problem"] as const) {
      if (Math.abs(target[k] - inStopShown[k]) < 0.5) inStopShown[k] = target[k];
      else inStopShown[k] += (target[k] - inStopShown[k]) * IN_STOP_METERS.EASE;
    }
    pushInStopMeter("economic", "hub-fill-economic", "hub-val-economic");
    pushInStopMeter("innovation", "hub-fill-innovation", "hub-val-innovation");
    pushInStopMeter("problem", "hub-fill-problem", "hub-val-problem");
  }, IN_STOP_METERS.TICK_MS);

  // ======================================================================
  // OPENING ONBOARDING  —  the welcome + one-control tutorial that plays before
  // the map is explorable. currentView starts at "intro", so the visit loop
  // ignores every landmark press until this finishes or is skipped (the gate).
  // The flow, all student paced:
  //   goal card -> Fox line 1 -> Fox line 2 (PRACTICE: point at Fox + press) ->
  //   Fox line 3 (highlight the meters) -> Fox line 4 (highlight the row) ->
  //   gate opens, Fox rests on the calm "point at any place" line.
  // This folds in the old static welcome (removed up in the hub build), so the
  // student is welcomed exactly once. A small Skip jumps straight to the open hub
  // from any step. Built from the SAME canvas cards + Interactable the rest of the
  // hub uses; every loop is setInterval (rAF pauses in the headset).
  // ======================================================================

  // ---- Fox's managed tutorial bubble (replaces the old static welcome) ----
  // One speech bubble by Fox's head whose words we swap per line by rebuilding the
  // cheap canvas mesh in place. It lives in hubGroup, so it hides under the travel
  // fade and returns with the map, exactly like the old welcome bubble did.
  let foxBubbleMesh: Mesh | null = null;
  function setFoxLine(body: string) {
    if (foxBubbleMesh) hubGroup.remove(foxBubbleMesh);
    foxBubbleMesh = makeSpeechBubble(ONBOARD_LINES.speaker, body, ONBOARD.BUBBLE_W);
    foxBubbleMesh.position.set(foxX + HUB.WELCOME_DX, ONBOARD.BUBBLE_Y, HUB.ROW_Z);
    hubGroup.add(foxBubbleMesh);
  }

  // ---- The two gold highlight frames Fox points with ----
  // A frame is a thick gold border with a clear center, so it brackets a target
  // without covering it. It is a plain decorative mesh (not Interactable), so it
  // never blocks the pointing ray, even sitting right in front of a tap target.
  const foxFrame = makeHighlightFrame(ONBOARD.FOX_FRAME_W, ONBOARD.FOX_FRAME_H, ONBOARD.HALO_COLOR);
  foxFrame.position.set(foxX, ONBOARD.FOX_FRAME_Y, HUB.ROW_Z + ONBOARD.FOX_FRAME_Z_OFF);
  (foxFrame.material as any).depthTest = false;
  (foxFrame.material as any).depthWrite = false;
  foxFrame.renderOrder = 40000;
  foxFrame.visible = false;
  hubGroup.add(foxFrame);

  // The meters frame rings the upper-left meters panel: same position + yaw, pushed
  // a touch behind it along its facing normal so the panel still reads in front.
  const metersNormalX = Math.sin(HUB_METERS.YAW);
  const metersNormalZ = Math.cos(HUB_METERS.YAW);
  const metersFrame = makeHighlightFrame(ONBOARD.METERS_FRAME_W, ONBOARD.METERS_FRAME_H, ONBOARD.HALO_COLOR);
  metersFrame.position.set(
    HUB_METERS.POS[0] - metersNormalX * ONBOARD.METERS_FRAME_BACK,
    HUB_METERS.POS[1],
    HUB_METERS.POS[2] - metersNormalZ * ONBOARD.METERS_FRAME_BACK,
  );
  metersFrame.rotation.set(0, HUB_METERS.YAW, 0, "YXZ");
  (metersFrame.material as any).depthTest = false;
  (metersFrame.material as any).depthWrite = false;
  metersFrame.renderOrder = 40000;
  metersFrame.visible = false;
  hubGroup.add(metersFrame);

  // ---- The Fox practice target ----  An invisible hit box over Fox so "point at
  // me and press" lands on something. Like the landmark hit boxes, it is a ray
  // target only; it is watched for a fresh press ONLY during the practice step.
  const foxHitMesh = meshBox(ONBOARD.FOX_HIT_W, ONBOARD.FOX_HIT_H, ONBOARD.FOX_HIT_D, "#ffffff");
  (foxHitMesh.material as any).transparent = true;
  (foxHitMesh.material as any).opacity = 0;
  (foxHitMesh.material as any).depthWrite = false;
  foxHitMesh.position.set(foxX, ONBOARD.FOX_HIT_Y, HUB.ROW_Z);
  const foxHitEntity = world.createTransformEntity(foxHitMesh).addComponent(Interactable);
  let foxHitWasPressed = false;

  // ---- The goal card + the three gold buttons ----
  const goalCard = makeGoalCard(
    ONBOARD_LINES.goalTitle, ONBOARD_LINES.goalIntro, ONBOARD_LINES.goalBullets, ONBOARD.GOAL_W,
    ONBOARD_LINES.experienceTitle, // the VR experience name, painted as the header atop the card
  );
  goalCard.position.set(ONBOARD.GOAL_POS[0], ONBOARD.GOAL_POS[1], ONBOARD.GOAL_POS[2]);
  (goalCard.material as any).depthTest = false;
  (goalCard.material as any).depthWrite = false;
  goalCard.renderOrder = 49000;
  goalCard.visible = false;
  scene.add(goalCard);

  // Each button is a gold pill that always reads over the world, wrapped in the
  // SAME Interactable the hub uses. Start and Next share one spot (only one shows
  // at a time). They sit in FRONT of the landmark row, so once the onboarding ends
  // we move them far out of the way: a hidden Interactable still raycasts, and an
  // in-front one would otherwise block the now-explorable row. (See
  // [[iwsdk-hidden-objects-stay-interactive]].)
  function makeOnboardButton(label: string, pos: [number, number, number], w: number, h: number) {
    const mesh = makeButtonCard(label, w, h);
    mesh.position.set(pos[0], pos[1], pos[2]);
    (mesh.material as any).depthTest = false;
    (mesh.material as any).depthWrite = false;
    mesh.renderOrder = 50000;
    mesh.visible = false;
    const entity = world.createTransformEntity(mesh).addComponent(Interactable);
    return { mesh, entity, wasPressed: false };
  }
  const obStartBtn = makeOnboardButton("Start", ONBOARD.ADVANCE_POS, ONBOARD.ADVANCE_W, ONBOARD.ADVANCE_H);
  const obNextBtn = makeOnboardButton("Next", ONBOARD.ADVANCE_POS, ONBOARD.ADVANCE_W, ONBOARD.ADVANCE_H);
  const obSkipBtn = makeOnboardButton("Skip intro", ONBOARD.SKIP_POS, ONBOARD.SKIP_W, ONBOARD.SKIP_H);
  // Resume prompt (Phase 4.1): shown INSTEAD of the goal card when saved progress
  // exists. Continue restores the map with its stamps; Start Over wipes the save and
  // runs the normal onboarding. Reuses the goal-card spot and the two button spots.
  const obContinueBtn = makeOnboardButton("Continue", ONBOARD.ADVANCE_POS, ONBOARD.ADVANCE_W, ONBOARD.ADVANCE_H);
  const obStartOverBtn = makeOnboardButton("Start over", ONBOARD.SKIP_POS, ONBOARD.SKIP_W, ONBOARD.SKIP_H);
  const resumeCard = makeTextPanel(ONBOARD_LINES.resumeTitle, ONBOARD_LINES.resumeBody, ONBOARD.GOAL_W);
  resumeCard.position.set(ONBOARD.GOAL_POS[0], ONBOARD.GOAL_POS[1], ONBOARD.GOAL_POS[2]);
  (resumeCard.material as any).depthTest = false;
  (resumeCard.material as any).depthWrite = false;
  resumeCard.renderOrder = 49000;
  resumeCard.visible = false;
  scene.add(resumeCard);

  // ---- The onboarding state machine ----
  // "goal" | 1..4 | "done". showStep paints one beat; finishOnboarding opens the
  // gate; startOnboarding shows the goal card. Only ever moves forward.
  let onboardStep: "resume" | "goal" | number | "done" = "goal";
  let savedAwardsToRestore: Record<string, { economic: number; innovation: number; problem: number }> | null = null;

  // Show the resume prompt: the map is still locked, the goal card hidden, and only
  // Continue / Start Over are live. Fox invites the student to pick up where they left off.
  function showResume() {
    onboardStep = "resume";
    goalCard.visible = false;
    resumeCard.visible = true;
    obStartBtn.mesh.visible = false;
    obNextBtn.mesh.visible = false;
    obSkipBtn.mesh.visible = false;
    obContinueBtn.mesh.visible = true;
    obStartOverBtn.mesh.visible = true;
    setFoxLine(ONBOARD_LINES.resume);
  }

  function showStep(s: "goal" | number) {
    onboardStep = s;
    const isGoal = s === "goal";
    resumeCard.visible = false;              // leave the resume prompt behind
    obContinueBtn.mesh.visible = false;
    obStartOverBtn.mesh.visible = false;
    goalCard.visible = isGoal;
    if (!isGoal) setFoxLine(ONBOARD_LINES.tut[(s as number) - 1]); // lines 1..4
    // Advance button: "Start" on the goal card; "Next" on lines 1, 3, 4. Line 2 is
    // the practice tap, so it shows no Next: the student advances by tapping Fox.
    obStartBtn.mesh.visible = isGoal;
    obNextBtn.mesh.visible = s === 1 || s === 3 || s === 4;
    obSkipBtn.mesh.visible = true;          // skippable from the goal card and every line
    // Highlights, one owner each: a frame on Fox (2), a frame on the meters (3), the
    // whole landmark row lit at once (4) via the bob loop's introHighlightLandmarks.
    foxFrame.visible = s === 2;
    metersFrame.visible = s === 3;
    introHighlightLandmarks = s === 4;
    if (s !== 2) fox.scale.setScalar(1);    // drop any practice-hover grow
  }

  function finishOnboarding() {
    onboardStep = "done";
    goalCard.visible = false;
    foxFrame.visible = false;
    metersFrame.visible = false;
    introHighlightLandmarks = false;
    fox.scale.setScalar(1);
    // Park every onboarding button far out of the ray path (hiding alone is not
    // enough: a hidden Interactable still raycasts, and these sit in front of the
    // now-explorable row). The Fox practice target goes with them.
    for (const b of [obStartBtn, obNextBtn, obSkipBtn, obContinueBtn, obStartOverBtn]) {
      b.mesh.visible = false;
      b.mesh.position.set(0, -1000, 0);
    }
    resumeCard.visible = false;
    foxHitMesh.position.set(0, -1000, 0);
    setFoxLine(ONBOARD_LINES.rest);         // Fox rests on the calm "point at any place" line
    currentView = "hub";                    // OPEN THE GATE: the map is now explorable
    sfxStage();                             // a soft "you're in" cue
  }

  function startOnboarding() {
    showStep("goal");
  }

  // One loop services the goal/tutorial: breathe the active highlight frame, give
  // each visible button hover-grow / press-squish and fire it once, and watch for
  // the practice tap on Fox during step 2. Gated entirely on onboardStep; once
  // "done" it idles. setInterval, not rAF (rAF pauses in the headset).
  function serviceOnboardButton(
    b: { mesh: Mesh; entity: any; wasPressed: boolean },
    active: boolean,
    onPress: () => void,
  ) {
    if (!active) {
      b.mesh.scale.setScalar(1);
      b.wasPressed = !!b.entity.hasComponent(Pressed); // swallow stray presses while hidden
      return;
    }
    const hov = !!b.entity.hasComponent(Hovered);
    const prs = !!b.entity.hasComponent(Pressed);
    b.mesh.scale.setScalar(prs ? ONBOARD.PRESS_SCALE : hov ? ONBOARD.HOVER_SCALE : 1);
    if (prs && !b.wasPressed) onPress();
    b.wasPressed = prs;
  }

  let onbT = 0;
  setInterval(function () {
    if (onboardStep === "done") return;
    onbT += ONBOARD.TICK_MS / 1000;

    // Breathe whichever highlight frame is up (a calm sine, never a flash).
    const t = 0.5 + 0.5 * Math.sin(onbT * ONBOARD.PULSE_SPEED);
    const pulse = ONBOARD.PULSE_MIN + (ONBOARD.PULSE_MAX - ONBOARD.PULSE_MIN) * t;
    if (foxFrame.visible) (foxFrame.material as any).opacity = pulse;
    if (metersFrame.visible) (metersFrame.material as any).opacity = pulse;

    // Start (goal card) -> first tutorial line.
    serviceOnboardButton(obStartBtn, onboardStep === "goal", function () {
      sfxClick();
      showStep(1);
    });
    // Next (lines 1, 3, 4) -> the next beat, or finish after line 4.
    const nextActive = onboardStep === 1 || onboardStep === 3 || onboardStep === 4;
    serviceOnboardButton(obNextBtn, nextActive, function () {
      sfxClick();
      if (onboardStep === 1) showStep(2);
      else if (onboardStep === 3) showStep(4);
      else finishOnboarding();              // after line 4
    });
    // Skip -> straight to the open hub. Live on the goal card and every tutorial line,
    // but NOT on the resume prompt (there the choice is Continue / Start Over).
    serviceOnboardButton(obSkipBtn, onboardStep !== "resume", function () {
      sfxClick();
      finishOnboarding();
    });
    // Resume prompt: Continue restores the saved map, Start Over wipes it and runs the
    // normal onboarding. Both are inert unless the resume prompt is up.
    serviceOnboardButton(obContinueBtn, onboardStep === "resume", function () {
      sfxChime();
      if (savedAwardsToRestore) restoreProgress(savedAwardsToRestore);
      finishOnboarding();                    // opens the map with its gold checks + filled meters
    });
    serviceOnboardButton(obStartOverBtn, onboardStep === "resume", function () {
      sfxClick();
      clearProgress();
      savedAwardsToRestore = null;
      showStep("goal");                      // fresh tour from the top
    });

    // The practice tap (line 2): Fox grows while pointed at, and a fresh press on
    // him advances to line 3. On every other step we just keep his latch in sync so
    // a stray press never counts.
    if (onboardStep === 2) {
      const hov = !!foxHitEntity.hasComponent(Hovered);
      fox.scale.setScalar(hov ? ONBOARD.FOX_HOVER_SCALE : 1);
      const prs = !!foxHitEntity.hasComponent(Pressed);
      if (prs && !foxHitWasPressed) {
        sfxChime();                         // a happy "you did it" cue
        showStep(3);
      }
      foxHitWasPressed = prs;
    } else {
      foxHitWasPressed = !!foxHitEntity.hasComponent(Pressed);
    }
  }, ONBOARD.TICK_MS);

  // Kick off the opening. currentView is already "intro", so the map stays locked.
  // A teacher can force a clean slate for the next class with ?fresh=1. Otherwise, if
  // a tour is saved, offer to resume it; if not, run the normal onboarding.
  let wantsFresh = false;
  try { wantsFresh = new URLSearchParams(location.search).get("fresh") === "1"; } catch (e) { /* ignore */ }
  if (wantsFresh) clearProgress();
  savedAwardsToRestore = wantsFresh ? null : loadSavedAwards();
  if (savedAwardsToRestore) showResume();
  else startOnboarding();

  // ======================================================================
  // EXPLORER REPORT  —  the finish of the Virginia tour. Once the student has
  // actually FINISHED all four stops (every STOPS.done true, so all four gold
  // checks are lit), Foreman Fox offers a "See your Explorer Report" button at
  // the hub. Pressing it opens a parchment report card that, in order: stamps the
  // four places explored, fills the three meters one at a time (each with 1 to 3
  // stars and one short, encouraging line), then names a Virginia title. A
  // "Save My Report" button opens a printable page a teacher can collect, and
  // "Return to the map" takes the student back, so the report is never a dead end.
  // The report is NEVER forced: the offer appears only when all four are done.
  //
  // The card is CANVAS-drawn (makeExplorerReportCard) so the gold stamps and
  // stars render in the headset. Nothing here changes the trigger, the meter
  // math, the four stops, the visit loop, the hub meters, or the gold checks.
  // Every loop is setInterval (rAF pauses in the headset). The
  // [[iwsdk-hidden-objects-stay-interactive]] rule applies: a hidden Interactable
  // is still clickable, so each button's PRESS is gated on the same conditions
  // that show it, not on .visible alone. All words use the fifth-grade,
  // second-person, no-em-dash voice; every tier is positive (no fail state).
  // ======================================================================

  // A gold button that always reads over the world, wrapped in a ray-target entity
  // (the SAME Interactable the hub landmarks use), parked at a position + yaw, and
  // hidden until the finish loop shows it.
  function makeReportButton(label: string, pos: [number, number, number], yaw: number, w: number, h: number) {
    const mesh = makeButtonCard(label, w, h);
    (mesh.material as any).depthTest = false;  // always readable over the sky / hub
    (mesh.material as any).depthWrite = false;
    mesh.renderOrder = 50000;
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(0, yaw, 0, "YXZ");
    mesh.visible = false;
    const entity = world.createTransformEntity(mesh).addComponent(Interactable);
    return { mesh, entity };
  }
  const seeReportBtn = makeReportButton("See your Explorer Report", REPORT.SEE_POS, REPORT.SEE_YAW, REPORT.SEE_W, REPORT.SEE_H);
  const reportReturnBtn = makeReportButton("Return to the map", REPORT.RETURN_POS, 0, REPORT.RETURN_W, REPORT.RETURN_H);
  const reportSaveBtn = makeReportButton("Save My Report", REPORT.SAVE_POS, 0, REPORT.SAVE_W, REPORT.SAVE_H);
  const reportPlayAgainBtn = makeReportButton("Play Again", REPORT.PLAY_AGAIN_POS, 0, REPORT.PLAY_AGAIN_W, REPORT.PLAY_AGAIN_H);

  // Play Again (Phase 4.2): wipe the saved tour and every in-memory total, close the
  // report, re-lock the map, and run the onboarding from the top for the next student.
  // finishOnboarding parks the onboarding buttons far off-screen, so restore them.
  let playAgainWasPressed = false;
  function playAgain() {
    clearProgress();
    for (const id in M6_AWARDS) delete M6_AWARDS[id];
    for (const s of STOPS) s.done = false;
    recomputeM6Totals();
    resetStopPreview();
    reportOpen = false;
    savedAwardsToRestore = null;
    obStartBtn.mesh.position.set(ONBOARD.ADVANCE_POS[0], ONBOARD.ADVANCE_POS[1], ONBOARD.ADVANCE_POS[2]);
    obNextBtn.mesh.position.set(ONBOARD.ADVANCE_POS[0], ONBOARD.ADVANCE_POS[1], ONBOARD.ADVANCE_POS[2]);
    obSkipBtn.mesh.position.set(ONBOARD.SKIP_POS[0], ONBOARD.SKIP_POS[1], ONBOARD.SKIP_POS[2]);
    obContinueBtn.mesh.position.set(ONBOARD.ADVANCE_POS[0], ONBOARD.ADVANCE_POS[1], ONBOARD.ADVANCE_POS[2]);
    obStartOverBtn.mesh.position.set(ONBOARD.SKIP_POS[0], ONBOARD.SKIP_POS[1], ONBOARD.SKIP_POS[2]);
    foxHitMesh.position.set(foxX, ONBOARD.FOX_HIT_Y, HUB.ROW_Z);
    if (foxBubbleMesh) { hubGroup.remove(foxBubbleMesh); foxBubbleMesh = null; } // drop the stale replay nudge
    currentView = "intro";     // lock the map again until the fresh onboarding opens it
    startOnboarding();
    sfxStage();
    console.log("[M6] play again: progress cleared, onboarding restarted");
  }

  // The report card itself: a canvas-drawn parchment certificate, so the gold
  // stamps and stars render in the headset (a UIKit font atlas would miss those
  // glyphs). One mesh added to the scene, redrawn as the reveal advances.
  // depthTest off so it reads over the hub; renderOrder is BELOW the buttons
  // (50000) so Save / Return draw on top of it.
  const reportCard = makeExplorerReportCard(REPORT.PANEL_W);
  (reportCard.mesh.material as any).depthTest = false;
  (reportCard.mesh.material as any).depthWrite = false;
  reportCard.mesh.renderOrder = 49000;
  reportCard.mesh.position.set(REPORT.PANEL_POS[0], REPORT.PANEL_POS[1], REPORT.PANEL_POS[2]);
  reportCard.mesh.visible = false;
  scene.add(reportCard.mesh);

  // The live report state the card draws. Rebuilt on each open from m6Totals (we
  // only READ the meter math here); the reveal loop eases the bars and flips the
  // shown / title flags over time. The four stops are always all stamped (the
  // report opens only when every one is done).
  type RMeter = { label: string; color: string; value: number; fill01: number; stars: number; line: string; shown: boolean };
  const reportState = {
    greeting: "Great work, Explorer!",
    stops: STOPS.map(function (s) { return { name: s.name }; }),
    meters: [] as RMeter[],
    title: "", titleNote: "", titleShown: false,
    savedNote: "",
  };
  function starsFor(v: number) { return v >= REPORT.STAR3_AT ? 3 : v >= REPORT.STAR2_AT ? 2 : 1; }

  // ---- SAVE MY REPORT (printable, laptop / teacher facing) ----  DOM renders
  // only on the laptop, not in the headset, so this is the page a teacher prints
  // or saves. Built once, re-filled on each Save; a print stylesheet hides
  // everything else so only the report prints. It carries the four stamped stops,
  // the three meter scores with their stars and lines, and the Virginia title.
  let printOverlay: HTMLDivElement | null = null;
  function ensurePrintOverlay(): HTMLDivElement {
    if (printOverlay) return printOverlay;
    const style = document.createElement("style");
    style.textContent = [
      "#m6-print{position:fixed;inset:0;background:rgba(20,28,40,0.55);display:none;z-index:2147483647;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif}",
      "#m6-print .sheet{background:#fff;color:#1F3A5F;width:680px;max-width:92vw;max-height:92vh;overflow:auto;border-radius:14px;padding:26px 34px;box-shadow:0 12px 48px rgba(0,0,0,0.4)}",
      "#m6-print .eyebrow{letter-spacing:3px;color:#8a6118;font-weight:bold;font-size:12px}",
      "#m6-print h1{font-size:25px;margin:2px 0;color:#1F3A5F}",
      "#m6-print .sub{color:#5b6b7e;font-size:13px;margin:2px 0 14px}",
      "#m6-print h2{font-size:14px;color:#8a6118;margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px}",
      "#m6-print .stops{display:flex;flex-wrap:wrap;gap:8px 22px}",
      "#m6-print .stop{font-size:16px;font-weight:bold}",
      "#m6-print .stamp{color:#c8962a}",
      "#m6-print .meter{margin:10px 0}",
      "#m6-print .meter .top{display:flex;justify-content:space-between;font-weight:bold;font-size:16px}",
      "#m6-print .stars{color:#c8962a;letter-spacing:2px}",
      "#m6-print .line{font-size:14px;margin-top:2px}",
      "#m6-print .title{margin-top:16px;background:#f4c20d;border-radius:10px;padding:12px 16px;text-align:center}",
      "#m6-print .title .name{font-size:22px;font-weight:bold}",
      "#m6-print .title .note{font-size:14px}",
      "#m6-print .foot{margin-top:16px;font-size:11px;color:#8a93a0;text-align:center}",
      "#m6-print .actions{margin-top:18px;display:flex;gap:12px;justify-content:center}",
      "#m6-print .actions button{font-size:15px;font-weight:bold;padding:9px 18px;border-radius:8px;border:0;cursor:pointer}",
      "#m6-print .do-print{background:#c8962a;color:#1F3A5F}",
      "#m6-print .do-close{background:#e2dccb;color:#1F3A5F}",
      "@media print{body *{visibility:hidden!important}#m6-print,#m6-print *{visibility:visible!important}#m6-print{position:absolute;inset:0;background:#fff;display:flex!important}#m6-print .sheet{box-shadow:none;max-height:none;width:100%}#m6-print .actions{display:none!important}}",
    ].join("");
    document.head.appendChild(style);
    const o = document.createElement("div");
    o.id = "m6-print";
    document.body.appendChild(o);
    printOverlay = o;
    return o;
  }
  function openPrintable() {
    const o = ensurePrintOverlay();
    const dateStr = new Date().toLocaleDateString();
    const starStr = function (n: number) { return "★".repeat(n) + "☆".repeat(3 - n); };
    const stopsHtml = reportState.stops.map(function (s) {
      return '<div class="stop"><span class="stamp">✓</span> ' + s.name + "</div>";
    }).join("");
    const metersHtml = reportState.meters.map(function (m) {
      return '<div class="meter"><div class="top"><span>' + m.label + "</span><span>" + m.value +
        ' <span class="stars">' + starStr(m.stars) + "</span></span></div>" +
        '<div class="line">' + m.line + "</div></div>";
    }).join("");
    o.innerHTML =
      '<div class="sheet">' +
      '<div class="eyebrow">VIRGINIA VENTURES &middot; EXPLORER REPORT</div>' +
      "<h1>Virginia Today: Industry Explorer</h1>" +
      '<div class="sub">' + reportState.greeting + " &nbsp;&middot;&nbsp; " + dateStr + "</div>" +
      "<h2>The four places you explored</h2>" +
      '<div class="stops">' + stopsHtml + "</div>" +
      "<h2>Your scores</h2>" + metersHtml +
      '<div class="title"><div class="name">' + reportState.title + '</div><div class="note">' + reportState.titleNote + "</div></div>" +
      '<div class="foot">Print this page or save it as a PDF for your teacher.</div>' +
      '<div class="actions"><button class="do-print">Print or Save as PDF</button><button class="do-close">Close</button></div>' +
      "</div>";
    (o.querySelector(".do-print") as HTMLButtonElement).onclick = function () { window.print(); };
    (o.querySelector(".do-close") as HTMLButtonElement).onclick = function () { o.style.display = "none"; };
    o.style.display = "flex";
  }

  // ---- OPEN / CLOSE ----  Open rebuilds the state from the live totals and starts
  // the reveal at zero; close hides the card. The meter math is only READ here.
  let reportOpen = false;
  let revealElapsed = 0;
  function openReport() {
    const eco = Math.round(m6Totals.economic), inn = Math.round(m6Totals.innovation), pr = Math.round(m6Totals.problem);
    reportState.meters = REPORT.METERS.map(function (m) {
      const v = Math.round((m6Totals as Record<string, number>)[m.key]);
      return {
        label: m.label, color: m.color, value: v, fill01: 0, stars: starsFor(v),
        line: v >= REPORT.LINE_HI_AT ? m.hi : m.warm, shown: false,
      };
    });
    const avg = (eco + inn + pr) / 3;
    const tier = REPORT.TITLES.find(function (t) { return avg >= t.at; }) || REPORT.TITLES[REPORT.TITLES.length - 1];
    reportState.title = tier.name;
    reportState.titleNote = tier.note;
    reportState.titleShown = false;
    reportState.savedNote = "";
    // Replay nudge (Phase 4.2): if a meter is below the 3-star line, Fox points to the
    // stop that most raises the LOWEST one. Encouraging, never required.
    const lows = [
      { key: "economic", v: eco }, { key: "innovation", v: inn }, { key: "problem", v: pr },
    ].filter(function (m) { return m.v < REPORT.STAR3_AT; }).sort(function (a, b) { return a.v - b.v; });
    setFoxLine(lows.length ? REPORT.REPLAY_HINTS[lows[0].key] : "Amazing work, explorer! You earned three stars all around.");
    revealElapsed = 0;
    reportOpen = true;
    reportCard.draw(reportState);     // first frame: the four stamps + empty meters
    sfxChime();                        // a warm, gentle reveal cue
    console.log("[M6] explorer report opened => totals", m6Totals, "title", tier.name);
  }
  function closeReport() {
    reportOpen = false;
    setFoxLine(ONBOARD_LINES.rest);    // Fox drops the replay nudge back to his calm line
    sfxClick();
  }

  // The one loop that runs the finish: offer the report once all four are done,
  // play the staged reveal while it is open, and drive the three buttons. The
  // reveal eases each bar and flips the shown / title flags over time, so the card
  // fills smoothly with no flashing. Visibility AND press-handling share the same
  // gate (hidden Interactables stay clickable). setInterval only.
  let seeReportWasPressed = false;
  let returnToMapWasPressed = false;
  let saveReportWasPressed = false;
  setInterval(function () {
    const allDone = STOPS.every(function (s) { return s.done; });
    const onMap = hubGroup.visible && currentView === "hub";
    // If a visit somehow starts while the report is up (e.g. the student points at a
    // landmark to revisit it), drop the overlay so it cannot bleed into the stop.
    if (reportOpen && !onMap) reportOpen = false;

    // --- The offer banner: only on the map, only once all four stops are finished,
    // and only while the report is not already open. ---
    const showSee = allDone && onMap && !reportOpen;
    seeReportBtn.mesh.visible = showSee;
    if (showSee) {
      const hov = !!seeReportBtn.entity.hasComponent(Hovered);
      const prs = !!seeReportBtn.entity.hasComponent(Pressed);
      seeReportBtn.mesh.scale.setScalar(prs ? REPORT.PRESS_SCALE : hov ? REPORT.HOVER_SCALE : 1);
      if (prs && !seeReportWasPressed) openReport();
      seeReportWasPressed = prs;
    } else {
      seeReportBtn.mesh.scale.setScalar(1);
      seeReportWasPressed = !!seeReportBtn.entity.hasComponent(Pressed); // swallow a carried press so it cannot fire on reveal
    }

    // --- The report card + its staged reveal ---
    const reportUp = reportOpen && onMap;
    reportCard.mesh.visible = reportUp;
    if (reportUp) {
      revealElapsed += REPORT.TICK_MS;
      let dirty = false;
      // Each meter starts filling in turn; its bar eases toward its score, and its
      // stars + line appear once it is essentially full (a soft tick on each).
      for (let i = 0; i < reportState.meters.length; i++) {
        const m = reportState.meters[i];
        if (revealElapsed >= REPORT.STOPS_HOLD_MS + i * REPORT.METER_GAP_MS) {
          const before = m.fill01;
          m.fill01 += (1 - m.fill01) * REPORT.FILL_EASE;
          if (Math.abs(m.fill01 - before) > 0.001) dirty = true;
          if (!m.shown && m.fill01 > 0.985) { m.shown = true; dirty = true; sfxClick(); }
        }
      }
      // The Virginia title lands last, with a warm cue.
      if (!reportState.titleShown && revealElapsed >= REPORT.TITLE_AT_MS) {
        reportState.titleShown = true; dirty = true; sfxFanfare();
      }
      if (dirty) reportCard.draw(reportState);

      // Return appears once the stamps are up (so it is never a dead end); Save
      // appears once the whole report has revealed. Both gated like the banner.
      const showReturn = revealElapsed >= REPORT.RETURN_AT_MS;
      reportReturnBtn.mesh.visible = showReturn;
      if (showReturn) {
        const hov = !!reportReturnBtn.entity.hasComponent(Hovered);
        const prs = !!reportReturnBtn.entity.hasComponent(Pressed);
        reportReturnBtn.mesh.scale.setScalar(prs ? REPORT.PRESS_SCALE : hov ? REPORT.HOVER_SCALE : 1);
        if (prs && !returnToMapWasPressed) closeReport();
        returnToMapWasPressed = prs;
      } else {
        returnToMapWasPressed = !!reportReturnBtn.entity.hasComponent(Pressed);
      }

      const showSave = revealElapsed >= REPORT.SAVE_AT_MS;
      reportSaveBtn.mesh.visible = showSave;
      if (showSave) {
        const hov = !!reportSaveBtn.entity.hasComponent(Hovered);
        const prs = !!reportSaveBtn.entity.hasComponent(Pressed);
        reportSaveBtn.mesh.scale.setScalar(prs ? REPORT.PRESS_SCALE : hov ? REPORT.HOVER_SCALE : 1);
        if (prs && !saveReportWasPressed) {
          openPrintable();              // bring up the teacher's printable page on the laptop
          if (!reportState.savedNote) { reportState.savedNote = "Report saved for your teacher."; reportCard.draw(reportState); }
          sfxClick();
        }
        saveReportWasPressed = prs;
      } else {
        saveReportWasPressed = !!reportSaveBtn.entity.hasComponent(Pressed);
      }

      // Play Again appears with Save (once the whole report is revealed): a fresh start
      // for the next student. Gated like the others (hidden Interactables still click).
      const showPlayAgain = revealElapsed >= REPORT.SAVE_AT_MS;
      reportPlayAgainBtn.mesh.visible = showPlayAgain;
      if (showPlayAgain) {
        const hov = !!reportPlayAgainBtn.entity.hasComponent(Hovered);
        const prs = !!reportPlayAgainBtn.entity.hasComponent(Pressed);
        reportPlayAgainBtn.mesh.scale.setScalar(prs ? REPORT.PRESS_SCALE : hov ? REPORT.HOVER_SCALE : 1);
        if (prs && !playAgainWasPressed) playAgain();
        playAgainWasPressed = prs;
      } else {
        playAgainWasPressed = !!reportPlayAgainBtn.entity.hasComponent(Pressed);
      }
    } else {
      // Closed or off the map: hide the card buttons and swallow any carried press.
      reportReturnBtn.mesh.visible = false;
      reportSaveBtn.mesh.visible = false;
      reportPlayAgainBtn.mesh.visible = false;
      reportReturnBtn.mesh.scale.setScalar(1);
      reportSaveBtn.mesh.scale.setScalar(1);
      reportPlayAgainBtn.mesh.scale.setScalar(1);
      returnToMapWasPressed = !!reportReturnBtn.entity.hasComponent(Pressed);
      saveReportWasPressed = !!reportSaveBtn.entity.hasComponent(Pressed);
      playAgainWasPressed = !!reportPlayAgainBtn.entity.hasComponent(Pressed);
    }
  }, REPORT.TICK_MS);

  // A panel's UI document loads over a frame or two. Run wiring once it is ready.
  function whenPanelReady(entity: any, callback: (doc: any) => void) {
    // Poll on setInterval, never requestAnimationFrame: rAF pauses the moment an
    // immersive session starts, which could leave a panel's buttons unwired if its
    // document finishes loading right as the student enters the headset. The interval
    // clears itself as soon as the doc is ready, so it costs nothing after wiring.
    const timer = setInterval(function () {
      if (entity.hasComponent(PanelDocument)) {
        const doc = entity.getValue(PanelDocument, "document");
        if (doc) {
          clearInterval(timer);
          callback(doc);
        }
      }
    }, 33);
  }

});
