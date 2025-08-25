// Three.js 福引(ふくびき) 風アプリケーション - script.js
let scene, camera, renderer, controls;
let square, rod, chute;
let sphere; // 단 하나의 구슬만
let wall; // 벽 변수

let isRotating = false;
let angularVelocity = 0;
let spinDecay = 0.985;
let emitted = false;

let gravity = 0.01;
let bounce = 0.7;
let friction = 0.98;

// 바구니 파츠 전역
let basketBottom, basketRight, basketBack, basketFront;

// 손잡이 전역
let handleGroup;

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 픽셀 비율 제한
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI;
  controls.enableKeys = false; // 키보드 컨트롤 비활성화

  addLights();
  createSquare();
  createBasket();
  
  // 초기 상태: 벽 숨기기
  const wallToggle = document.getElementById('wallToggle');
  wallToggle.checked = false;
  if (wall && scene.children.includes(wall)) {
    scene.remove(wall);
  }

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
  directionalLight.shadow.mapSize.width = 1024; // 그림자 맵 크기 축소
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  scene.add(directionalLight);
}

// 드럼 본체, 바닥, 막대, 슈트, A형 지지대, 손잡이, 구슬 1개 생성
function createSquare() {
  // 드럼 본체 (불투명)
  const bodyGeo = new THREE.CylinderGeometry(3, 3, 1, 8);
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.computeBoundingSphere(); // 바운딩 스피어 미리 계산

  // wood.png 텍스처 로드
  const textureLoader = new THREE.TextureLoader();
  const woodTexture = textureLoader.load('wood.png');
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2, 1);

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

  // 드럼에 작은 흰색 원 추가
  const circleGeometry = new THREE.CircleGeometry(1, 32);
  
  // logo.png 텍스처 로드
  const logoTexture = textureLoader.load('logo.png');
  logoTexture.wrapS = THREE.RepeatWrapping;
  logoTexture.wrapT = THREE.RepeatWrapping;
  
  const circleMaterial = new THREE.MeshBasicMaterial({ 
    map: logoTexture,
    transparent: true
  });
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.set(0, 0, 0.51); // 드럼 표면에서 약간 앞으로
  circle.rotation.z = -Math.PI / 2; // 드럼 표면에 평행하게
  square.add(circle); // 드럼의 자식으로 추가하여 회전과 함께 움직이도록

  // 바닥
  const floorGeometry = new THREE.BoxGeometry(12, 0.5, 12);
  
  // banner.png 텍스처 로드
  const bannerTexture = textureLoader.load('banner.png');
  bannerTexture.wrapS = THREE.RepeatWrapping;
  bannerTexture.wrapT = THREE.RepeatWrapping;
  bannerTexture.repeat.set(1, 2); // 텍스처 반복
  
  const texMat = new THREE.MeshPhongMaterial({ map: bannerTexture });
  const plainMat = new THREE.MeshPhongMaterial({ color: 0xffffff });

  const materials = [
    plainMat,   // right
    plainMat,   // left
    texMat,   // top
    plainMat,   // bottom
    plainMat,   // front (이 면만 텍스처)
    plainMat    // back
  ];

  const floor = new THREE.Mesh(floorGeometry, materials);
  floor.position.set(0, -0.25, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // 뒤쪽 벽 (바닥과 90도 각도)
  const wallGeometry = new THREE.BoxGeometry(12, 8, 0.2);
  
  // hommy.png 텍스처 로드
  const hommyTexture = textureLoader.load('hommy.png');
  hommyTexture.wrapS = THREE.RepeatWrapping;
  hommyTexture.wrapT = THREE.RepeatWrapping;
  hommyTexture.repeat.set(1, 1); // 텍스처 반복
  
  const wallTexMat = new THREE.MeshPhongMaterial({ map: hommyTexture });
  const wallPlainMat = new THREE.MeshPhongMaterial({ color: 0xf0f0f0 });
  
  const wallMaterials = [
    wallPlainMat,   // right
    wallPlainMat,   // left
    wallPlainMat,   // top
    wallPlainMat,   // bottom
    wallTexMat,     // front (드럼을 향하는 면에 텍스처)
    wallPlainMat    // back
  ];
  
  wall = new THREE.Mesh(wallGeometry, wallMaterials);
  wall.position.set(0, 4, -6); // 바닥 뒤쪽에 위치
  wall.receiveShadow = true;
  scene.add(wall);

  // 중앙 막대 (장식) — 드럼의 축 방향(z축)으로 보이도록 X축 회전
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
  createAFrameStand(-0.9);
  createAFrameStand(+0.9);

  // --- 손잡이(크랭크) 생성: 드럼 앞면(z+)에 부착 ---
  createHandle();

  // 구슬 1개 생성 (드럼 내부 중심에서 시작)
  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  sphereGeo.computeBoundingSphere(); // 바운딩 스피어 미리 계산
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

// 손잡이(크랭크) 생성 — square의 자식으로 붙여 드럼 회전과 동기화
function createHandle() {
  handleGroup = new THREE.Group();
  // square(드럼)의 로컬 기준에 부착
  // 드럼 "두께"는 1, 앞면 대략 z=+0.5 부근 → 손잡이 축을 조금 더 앞으로(0.8) 빼준다
  handleGroup.position.set(0, 0, 0);
  square.add(handleGroup);

  // 축(앞으로 돌출): z축 방향
  const axisGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 16);
  axisGeo.rotateX(Math.PI / 2); // y축→z축 정렬
  const axisMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60, metalness: 0.2 });
  const axis = new THREE.Mesh(axisGeo, axisMat);
  axis.position.set(0, 0, 0.8); // 드럼 앞면보다 약간 앞으로
  axis.castShadow = true;
  axis.receiveShadow = true;
  handleGroup.add(axis);

  // 크랭크 암(팔): x 방향으로 돌출
  const armGeo = new THREE.BoxGeometry(0.8, 0.06, 0.06);
  const armMat = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 50 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.set(0.4, 0, 1.35); // 축 끝에서 오른쪽으로 0.4
  arm.castShadow = true;
  arm.receiveShadow = true;
  handleGroup.add(arm);

  // 그립(손잡이): 세로 원기둥
  const gripGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10);
  gripGeo.rotateX(Math.PI / 2);
  const gripMat = new THREE.MeshPhongMaterial({ color: 0xff7b54, shininess: 40 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  // 기본 축이 y이므로 세로 그립으로 적당
  grip.position.set(0.8, 0, 1.6); // 암 끝에서 약간 위
  grip.castShadow = true;
  grip.receiveShadow = true;
  handleGroup.add(grip);

  // 보기 좋게 엣지 라인
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  [axis, arm, grip].forEach((m) => {
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat));
  });
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

  // 왼쪽 다리
  const leftLen = Math.hypot(baseHalfX, topY - baseY);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(legThickness, leftLen, legThickness), mat);
  leftLeg.position.set(baseHalfX / 2, (topY + baseY) / 2, zPos);
  leftLeg.rotation.z = Math.atan2(baseHalfX, topY - baseY); // 안쪽으로 기울임
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;

  // 오른쪽 다리
  const rightLen = leftLen;
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(legThickness, rightLen, legThickness), mat);
  rightLeg.position.set(-baseHalfX / 2, (topY + baseY) / 2, zPos);
  rightLeg.rotation.z = -Math.atan2(baseHalfX, topY - baseY); // 안쪽으로 기울임
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;

  // 가로 보강대
  const spanAtCross = baseHalfX * (1 - crossY / topY) * 2;
  const cross = new THREE.Mesh(new THREE.BoxGeometry(Math.max(spanAtCross, 0.2), legThickness, legThickness), mat);
  cross.position.set(0, crossY, zPos);
  cross.castShadow = true;
  cross.receiveShadow = true;

  // 발판
  const footW = 0.36, footH = 0.06, footD = 0.28;
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(footW, footH, footD), mat);
  leftFoot.position.set(-baseHalfX, footH / 2, zPos);
  leftFoot.castShadow = true; leftFoot.receiveShadow = true;

  const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(footW, footH, footD), mat);
  rightFoot.position.set(+baseHalfX, footH / 2, zPos);
  rightFoot.castShadow = true; rightFoot.receiveShadow = true;

  // 와이어 느낌의 에지
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x9ca3af });
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

  // 오른쪽 벽
  basketRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1), basketMat);
  basketRight.position.set(chute.position.x + 1.0, 0.4, chute.position.z);
  basketRight.castShadow = true;
  basketRight.receiveShadow = true;
  scene.add(basketRight);

  // 뒷벽
  basketBack = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.1), basketMat);
  basketBack.position.set(chute.position.x, 0.4, chute.position.z - 0.5);
  basketBack.castShadow = true;
  basketBack.receiveShadow = true;
  scene.add(basketBack);

  // 앞벽 (열어두고 싶다면 이 부분 제거)
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

  const hex = ball.material.color.getHex();
  if (hex === 0xff4444) {
    console.log('🎉 当たり!!');
  }
}

// 새로운 공 생성(회전 완전 정지 후 리필)
function createNewBall() {
  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const sphereMat = new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 80 });
  const newSphere = new THREE.Mesh(sphereGeo, sphereMat);
  newSphere.position.set(0, 5, 0);
  newSphere.userData = {
    inside: true,
    localPos: new THREE.Vector3(0, 0, 0)
  };
  newSphere.velocity = new THREE.Vector3(0, 0, 0);
  newSphere.castShadow = true;
  newSphere.receiveShadow = true;

  if (sphere) scene.remove(sphere);
  sphere = newSphere;
  scene.add(sphere);
}

// 애니메이션 루프
let lastTime = 0;
function animate(currentTime) {
  requestAnimationFrame(animate);
  
  // 프레임 레이트 제한 (60fps)
  if (currentTime - lastTime < 16) return; // 약 60fps
  lastTime = currentTime;

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
    sphere.position.copy(sphere.userData.localPos).add(new THREE.Vector3(0, 5, 0));
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

    // basketRight(오른쪽 벽) 충돌
    if (basketRight) {
      const r = 0.12;
      const wallHalf = 0.05; // 0.1 두께의 절반
      const wallXInner = basketRight.position.x - wallHalf;
      const sphereY = sphere.position.y;
      const sphereZ = sphere.position.z;
      const basketY = basketRight.position.y;
      const basketZ = basketRight.position.z;
      
      if (sphereY >= 0 && sphereY <= (basketY + 1.0) && 
          sphereZ >= (basketZ - 0.5) && sphereZ <= (basketZ + 0.5) && 
          (sphere.position.x + r > wallXInner)) {
        sphere.position.x = wallXInner - r;
        sphere.velocity.x = -sphere.velocity.x * bounce;
        sphere.velocity.y *= friction;
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
    // 회전 완전 정지 후 내부 공이 없으면 새 공 투입
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

// 벽 토글
function toggleWall() {
  const toggle = document.getElementById('wallToggle');
  if (toggle.checked) {
    // 벽 표시
    if (wall && !scene.children.includes(wall)) {
      scene.add(wall);
    }
  } else {
    // 벽 숨기기
    if (wall && scene.children.includes(wall)) {
      scene.remove(wall);
    }
  }
}

// 초기화
window.addEventListener('load', init);
