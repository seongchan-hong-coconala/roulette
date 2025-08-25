// Three.js 福引(ふくびき) 風アプリケーション - script.js
let scene, camera, renderer, controls;
let square, rod, chute;
let sphere; // 단 하나의 구슬만

let isRotating = false;
let angularVelocity = 0;
let spinDecay = 0.985;
let emitted = false;

let gravity = 0.01;
let bounce = 0.7;
let friction = 0.98;

// 맨 위 전역에 추가
let basketBottom, basketRight, basketBack, basketFront;


// 초기화
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // 하늘색

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(4, 6, 4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI;

  addLights();
  createSquare();
  createBasket();
  window.addEventListener('resize', onWindowResize);
  requestAnimationFrame(animate);
}

// 조명
function addLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
}

// 드럼 본체, 바닥, 막대, 슈트, A형 지지대, 구슬 1개 생성
function createSquare() {
  // 드럼 본체 (불투명)
  const bodyGeo = new THREE.CylinderGeometry(3, 3, 1, 8);
  bodyGeo.rotateX(Math.PI / 2);
  
  // wood.png 텍스처 로드
  const textureLoader = new THREE.TextureLoader();
  const woodTexture = textureLoader.load('wood.png');
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2, 1); // 텍스처 반복 설정
  
  const bodyMat = new THREE.MeshPhongMaterial({
    map: woodTexture,
    side: THREE.DoubleSide,
    shininess: 100,
    transparent: false
  });

  const edges = new THREE.EdgesGeometry(bodyGeo);
  const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));

  square = new THREE.Mesh(bodyGeo, bodyMat);
  square.position.set(0, 5, 0);
  square.castShadow = true;
  square.receiveShadow = true;
  square.add(wireframe);
  scene.add(square);

  // 바닥
  const floorGeometry = new THREE.PlaneGeometry(12, 12);
  const floorMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.set(0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 중앙 막대 (장식)
  const rodGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2.0, 16);
  rodGeometry.rotateX(Math.PI / 2);
  const rodMaterial = new THREE.MeshPhongMaterial({ color: 0x4b5563 });
  rod = new THREE.Mesh(rodGeometry, rodMaterial);
  rod.position.set(0, 5, 0);
  rod.castShadow = true;
  rod.receiveShadow = true;
  scene.add(rod);

  // 슈트(배출구)
  const chuteGeometry = new THREE.BoxGeometry(0.5, 0.2, 2.0);
  const chuteMaterial = new THREE.MeshPhongMaterial({ color: 0x6699ff });
  chute = new THREE.Mesh(chuteGeometry, chuteMaterial);
  chute.position.set(2.8, 4.7, 0);
  chute.rotation.z = -Math.PI / 10;
  chute.castShadow = true;
  chute.receiveShadow = true;
  scene.add(chute);

  // --- A형 지지대 생성 (좌/우 한 쌍씩) ---
  createAFrameStand(-0.9); // 좌측(A) - z 음수
  createAFrameStand(+0.9); // 우측(A) - z 양수

  // 구슬 1개 생성 (드럼 내부 중심에서 시작)
  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const sphereMat = new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 80 });
  sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(0, 5, 0);
  sphere.userData = {
    inside: true,
    localPos: new THREE.Vector3(0, 0, 0) // 드럼 내부 로컬 좌표
  };
  sphere.velocity = new THREE.Vector3(0, 0, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);
}

// A형 지지대: 같은 z 평면 상에 좌/우 두 다리 + 가로 보강대
function createAFrameStand(zPos) {
  const mat = new THREE.MeshPhongMaterial({
    color: 0x4b5563, // slate gray
    shininess: 20
  });

  const legThickness = 0.16;
  const topY = 5.0;      // 드럼 중심 높이
  const baseY = 0.0;     // 바닥
  const baseHalfX = 1.2; // 바닥에서 다리 간 벌어짐 절반
  const crossY = 2.2;    // 가로 보강대 높이

  // 왼쪽 다리: (x=-baseHalfX, y=0) -> (x=0, y=topY)
  const leftLen = Math.hypot(baseHalfX, topY - baseY);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(legThickness, leftLen, legThickness), mat);
  leftLeg.position.set(baseHalfX / 2, (topY + baseY) / 2, zPos);
  leftLeg.rotation.z = Math.atan2(baseHalfX, topY - baseY); // 안쪽으로 기울임
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;

  // 오른쪽 다리: (x=+baseHalfX, y=0) -> (x=0, y=topY)
  const rightLen = leftLen;
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(legThickness, rightLen, legThickness), mat);
  rightLeg.position.set(-baseHalfX / 2, (topY + baseY) / 2, zPos);
  rightLeg.rotation.z = -Math.atan2(baseHalfX, topY - baseY); // 안쪽으로 기울임
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;

  // 가로 보강대 (A의 가로 획)
  // 해당 높이에서 좌/우 다리 사이 x 거리 계산
  // 다리 방정식으로 간단히 근사: y 비율로 x 스팬 선형 감쇠
  const spanAtCross = baseHalfX * (1 - crossY / topY) * 2; // 좌우 합
  const cross = new THREE.Mesh(new THREE.BoxGeometry(Math.max(spanAtCross, 0.2), legThickness, legThickness), mat);
  cross.position.set(0, crossY, zPos);
  cross.castShadow = true;
  cross.receiveShadow = true;

  // 바닥 받침(발판) — 안정감
  const footW = 0.36, footH = 0.06, footD = 0.28;
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(footW, footH, footD), mat);
  leftFoot.position.set(-baseHalfX, footH / 2, zPos);
  leftFoot.castShadow = true; leftFoot.receiveShadow = true;

  const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(footW, footH, footD), mat);
  rightFoot.position.set(+baseHalfX, footH / 2, zPos);
  rightFoot.castShadow = true; rightFoot.receiveShadow = true;

  // 와이어 느낌의 에지
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x9ca3af }); // light gray
  const addEdges = (mesh) => mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));

  [leftLeg, rightLeg, cross, leftFoot, rightFoot].forEach(addEdges);

  scene.add(leftLeg, rightLeg, cross, leftFoot, rightFoot);
}

function createBasket() {
    const basketMat = new THREE.MeshPhongMaterial({ color: 0x888888, side: THREE.DoubleSide });
  
    // 바닥 (살짝 경사)
    basketBottom = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), basketMat);
    basketBottom.position.set(chute.position.x, 0.06, chute.position.z);
    basketBottom.rotation.x = -Math.PI / 18;
    basketBottom.castShadow = true;
    basketBottom.receiveShadow = true;
    scene.add(basketBottom);
  
    // 오른쪽 벽  ← 전역 변수로
    basketRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1), basketMat);
    basketRight.position.set(chute.position.x + 1.0, 0.4, chute.position.z);
    basketRight.castShadow = true;
    basketRight.receiveShadow = true;
    scene.add(basketRight);
  
    // 뒷벽  ← 전역 변수로
    basketBack = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.1), basketMat);
    basketBack.position.set(chute.position.x, 0.4, chute.position.z - 0.5);
    basketBack.castShadow = true;
    basketBack.receiveShadow = true;
    scene.add(basketBack);
  
    // 앞벽  ← 전역 변수로 (열어두고 싶다면 이 파트는 제거)
    basketFront = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.1), basketMat);
    basketFront.position.set(chute.position.x, 0.4, chute.position.z + 0.5);
    basketFront.castShadow = true;
    basketFront.receiveShadow = true;
    scene.add(basketFront);
  }
  

// 구슬 배출
function emitBall(ball) {
  ball.userData.inside = false;
  const dir = new THREE.Vector3(0.05, -0.35, 0).normalize();
  ball.velocity.copy(dir.multiplyScalar(0.22));

  // 빨간 공 당첨 처리 (원하면 토스트/사운드 추가)
  const hex = ball.material.color.getHex();
  if (hex === 0xff4444) {
    console.log('🎉 当たり!!');
  }
}

// 새로운 공 생성
function createNewBall() {
  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const sphereMat = new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 80 });
  const newSphere = new THREE.Mesh(sphereGeo, sphereMat);
  newSphere.position.set(0, 5, 0);
  newSphere.userData = {
    inside: true,
    localPos: new THREE.Vector3(0, 0, 0) // 드럼 내부 로컬 좌표
  };
  newSphere.velocity = new THREE.Vector3(0, 0, 0);
  newSphere.castShadow = true;
  newSphere.receiveShadow = true;
  
  // 기존 공을 제거하고 새 공으로 교체
  if (sphere) {
    scene.remove(sphere);
  }
  sphere = newSphere;
  scene.add(sphere);
}

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);

  if (isRotating) {
    angularVelocity = Math.min(angularVelocity + 0.002, 0.18);
  } else {
    angularVelocity *= spinDecay;
    if (angularVelocity < 0.0005) angularVelocity = 0;
  }

  if (square) square.rotation.z += angularVelocity;

  // 구슬 업데이트
  if (sphere.userData.inside) {
    sphere.userData.localPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), angularVelocity);
    sphere.position.copy(sphere.userData.localPos.clone().add(new THREE.Vector3(0, 5, 0)));
} else {
    // 외부로 배출된 경우
    sphere.velocity.y -= gravity;
    sphere.position.add(sphere.velocity);
  
    // 바닥(Y=0) 충돌
    if (sphere.position.y <= 0.1) {
      sphere.position.y = 0.1;
      sphere.velocity.y = -sphere.velocity.y * bounce;
      sphere.velocity.x *= friction;
      sphere.velocity.z *= friction;
    }
  
    // ---- basketRight(오른쪽 벽) 충돌 처리 추가 ----
    if (basketRight) {
      const r = 0.12;                       // 구슬 반지름
      const wallHalf = 0.05;                // 벽 두께 0.1 → 반두께
      const wallXInner = basketRight.position.x - wallHalf; // 바구니 내부 쪽 면의 x
      // 구슬 높이/깊이가 벽 영역 내일 때만 x 충돌 검사
      const withinHeight = (sphere.position.y >= 0) && (sphere.position.y <= (basketRight.position.y + 1.0)); // 대략적 범위
      const withinDepth  = (sphere.position.z >= (basketRight.position.z - 0.5)) && (sphere.position.z <= (basketRight.position.z + 0.5));
      if (withinHeight && withinDepth && (sphere.position.x + r > wallXInner)) {
        sphere.position.x = wallXInner - r;          // 벽 안으로 파고들지 않게 위치 보정
        sphere.velocity.x = -sphere.velocity.x * bounce; // X 성분 반사
        sphere.velocity.y *= friction;               // 마찰 약간
        sphere.velocity.z *= friction;
      }
    }
  }

  // 스핀 중 단 1회 배출
  if (isRotating && !emitted && angularVelocity > 0.12) {
    emitted = true;
    if (sphere.userData.inside) emitBall(sphere);
  }
  if (!isRotating && angularVelocity === 0) {
    emitted = false;
    // 회전이 완전히 멈추면 새로운 공 생성
    if (!sphere.userData.inside) {
      createNewBall();
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// 리사이즈
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 버튼 토글
function toggleRotation() {
  isRotating = !isRotating;
  const button = document.getElementById('rotationButton');
  if (isRotating) {
    button.textContent = 'STOP';
    button.style.backgroundColor = '#ff4444';
    angularVelocity = Math.max(angularVelocity, 0.06);
  } else {
    button.textContent = 'START';
    button.style.backgroundColor = '#00ff88';
  }
}

// 초기화
window.addEventListener('load', init);
