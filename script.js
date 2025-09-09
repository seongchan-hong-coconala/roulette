// Three.js 福引(ふくびき) 風アプリケーション - script.js
let scene, camera, renderer, controls;
let square, rod, chute;
let sphere; // 단 하나의 구슬만
let wall; // 벽 변수

let isRotating = false;
let angularVelocity = 0;
let spinDecay = 0.985;
let emitted = false;
let autoStopTimer = null;
let emitTimer = null;

// 카메라 애니메이션 변수
let cameraAnimating = false;
let cameraAnimationStart = null;
let cameraAnimationDuration = 2000; // 2초
let cameraReturnDuration = 2000; // 2초
let cameraWaitDuration = 1000; // 1초 대기
let originalCameraPosition = new THREE.Vector3();
let targetCameraPosition = new THREE.Vector3(3.99, 7.81, 4.08);
let isReturning = false;
let isWaiting = false;

let gravity = 0.01;
let bounce = 0.45;
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
  camera.position.set(0, 6, 15); // 정면 위치로 변경
  

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
  // createBasket();
  
  // 초기 상태: 벽 숨기기
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
    plainMat,   // front
    plainMat    // back
  ];

  const floor = new THREE.Mesh(floorGeometry, materials);
  floor.position.set(0, -0.25, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // 뒤쪽 벽 (바닥과 90도 각도)
  const wallGeometry = new THREE.BoxGeometry(12, 8, 0.2);
  
  const wallPlainMat = new THREE.MeshPhongMaterial({ color: 0xf0f0f0 });
  
  const wallMaterials = [
    wallPlainMat,   // right
    wallPlainMat,   // left
    wallPlainMat,   // top
    wallPlainMat,   // bottom
    wallPlainMat,   // front
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
  
  // 기본적으로 파란색(꽝)으로 시작
  const isWinner = false;
  const sphereColor = 0x4444ff;
  const sphereMat = new THREE.MeshPhongMaterial({ color: sphereColor, shininess: 80 });
  
  sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(0, 5, 0);
  sphere.userData = {
    inside: true,
    localPos: new THREE.Vector3(0, 0, 0), // 드럼 내부 로컬 좌표
    isWinner: isWinner
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

// 카메라 애니메이션 시작
function startCameraAnimation() {
  if (cameraAnimating) return;
  
  cameraAnimating = true;
  cameraAnimationStart = Date.now();
  originalCameraPosition.copy(camera.position);
}

// 카메라 애니메이션 업데이트
function updateCameraAnimation() {
  if (!cameraAnimating) return;
  
  const elapsed = Date.now() - cameraAnimationStart;
  
  if (isWaiting) {
    // 대기 상태 - 아무것도 하지 않음
    if (elapsed >= cameraWaitDuration) {
      isWaiting = false;
      isReturning = true;
      cameraAnimationStart = Date.now();
    }
    return;
  }
  
  const duration = isReturning ? cameraReturnDuration : cameraAnimationDuration;
  const progress = Math.min(elapsed / duration, 1);
  
  // easeOutCubic 함수 사용 (부드러운 애니메이션)
  const easeProgress = 1 - Math.pow(1 - progress, 3);
  
  // 카메라 위치 보간
  if (isReturning) {
    // 원위치로 돌아가기
    camera.position.lerpVectors(targetCameraPosition, originalCameraPosition, easeProgress);
  } else {
    // 목표 위치로 이동
    camera.position.lerpVectors(originalCameraPosition, targetCameraPosition, easeProgress);
  }
  
  // 애니메이션 완료
  if (progress >= 1) {
    if (isReturning) {
      // 원위치 복귀 완료
      cameraAnimating = false;
      isReturning = false;
      isWaiting = false;
    } else {
      // 목표 위치 도달, 대기 상태로 전환
      isWaiting = true;
      cameraAnimationStart = Date.now();
    }
  }
}

// 구슬 배출
function emitBall(ball) {
  ball.userData.inside = false;
  // 슈트 위치로 이동 후 수직으로 떨어뜨리기
  ball.position.set(2.8, 4.7, 0); // 슈트 위치
  const dir = new THREE.Vector3(0, -1, 0); // 수직 아래 방향
  ball.velocity.copy(dir.multiplyScalar(0.3));

  // 카메라 애니메이션 시작
  startCameraAnimation();

  // 당첨 여부 확인 (콘솔에만 출력, 말풍선은 바닥 충돌 시 표시)
  if (ball.userData.isWinner) {
    console.log('🎉 当たり!!');
  } else {
    console.log('💔 はずれ');
  }
}

// 떠다니는 텍스트와 화살표 생성
function createFloatingText(text, color, ball) {
  // HTML2DCanvas로 텍스트 생성
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  
  // 흰색 배경 그리기
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // 검은색 테두리 그리기
  context.strokeStyle = 'rgba(0, 0, 0, 1)';
  context.lineWidth = 3;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // 텍스트 그리기
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // 텍스처 생성
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    alphaTest: 0.1
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2, 1, 1);
  // 카메라 앞쪽에 말풍선 배치 (카메라 위치: 4, 6, 4)
  sprite.position.set(2, 5, 2); // 카메라보다 앞쪽에 배치
  scene.add(sprite);
  
  // 화살표 생성 (공과 말풍선을 연결)
  createDynamicArrow(ball, sprite);
  
  // 텍스트는 계속 유지 (사라지지 않음)
}

// 동적 화살표 생성 (공이 움직일 때마다 업데이트)
function createDynamicArrow(ball, textSprite) {
  // 점선을 위한 그룹
  const arrowGroup = new THREE.Group();
  scene.add(arrowGroup);
  
  // 화살표 업데이트 함수
  function updateArrow() {
    if (!ball || !textSprite) return;
    
    const fromPos = ball.position.clone();
    const toPos = textSprite.position.clone();
    const direction = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
    const distance = fromPos.distanceTo(toPos);
    
    // 기존 점선 제거
    while (arrowGroup.children.length > 0) {
      const child = arrowGroup.children[0];
      arrowGroup.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    
    // 점선 생성
    const segmentLength = 0.2; // 각 점의 길이
    const gapLength = 0.1; // 점 사이의 간격
    const offsetFromBall = 0.3; // 공에서 떨어뜨리는 거리
    const totalSegmentLength = segmentLength + gapLength;
    const availableDistance = distance - offsetFromBall;
    const numSegments = Math.floor(availableDistance / totalSegmentLength);
    
    for (let i = 0; i < numSegments; i++) {
      const segmentGeometry = new THREE.CylinderGeometry(0.01, 0.01, segmentLength, 8); // 더 얇게
      const segmentMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.6 // 약간 투명하게
      });
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
      
      // 점의 위치 계산 (공에서 offsetFromBall만큼 떨어진 지점부터 시작)
      const t = (offsetFromBall + i * totalSegmentLength + segmentLength / 2) / distance;
      const segmentPos = new THREE.Vector3().lerpVectors(fromPos, toPos, t);
      
      segment.position.copy(segmentPos);
      segment.lookAt(toPos);
      segment.rotateX(Math.PI / 2);
      
      arrowGroup.add(segment);
    }
  }
  
  // 화살표를 전역 변수에 저장하여 애니메이션 루프에서 업데이트
  if (!window.currentArrow) {
    window.currentArrow = { group: arrowGroup, update: updateArrow };
  } else {
    // 기존 화살표 제거
    scene.remove(window.currentArrow.group);
    while (window.currentArrow.group.children.length > 0) {
      const child = window.currentArrow.group.children[0];
      window.currentArrow.group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    window.currentArrow.group.geometry?.dispose();
    window.currentArrow.group.material?.dispose();
    
    window.currentArrow = { group: arrowGroup, update: updateArrow };
  }
  
  // 3초 후 화살표 제거
  setTimeout(() => {
    if (window.currentArrow && window.currentArrow.group === arrowGroup) {
      scene.remove(arrowGroup);
      while (arrowGroup.children.length > 0) {
        const child = arrowGroup.children[0];
        arrowGroup.remove(child);
        child.geometry.dispose();
        child.material.dispose();
      }
      window.currentArrow = null;
    }
  }, 3000);
}

// 새로운 공 생성(회전 완전 정지 후 리필)
function createNewBall() {
  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  
  // 기본적으로 파란색(꽝)으로 시작
  const isWinner = false;
  const sphereColor = 0x4444ff;
  const sphereMat = new THREE.MeshPhongMaterial({ color: sphereColor, shininess: 80 });
  
  const newSphere = new THREE.Mesh(sphereGeo, sphereMat);
  newSphere.position.set(0, 5, 0);
  newSphere.userData = {
    inside: true,
    localPos: new THREE.Vector3(0, 0, 0),
    isWinner: isWinner
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

  if (square) square.rotation.z -= angularVelocity;

  // 구슬 업데이트
  if (sphere.userData.inside) {
    sphere.userData.localPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), -angularVelocity);
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
      
      // 바닥 충돌 시 말풍선과 화살표 표시 (한 번만)
      if (!sphere.userData.showedResult) {
        sphere.userData.showedResult = true;
        if (sphere.userData.isWinner) {
          createFloatingText('当たり!', 0xff4444, sphere);
        } else {
          createFloatingText('はずれ', 0x4444ff, sphere);
        }
      }
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
  // 공 배출은 이제 타이머로 처리됨 (랜덤 타이밍)
  
  // 화살표 업데이트 (공이 움직일 때마다)
  if (window.currentArrow && window.currentArrow.update) {
    window.currentArrow.update();
  }

  // 카메라 애니메이션 업데이트
  updateCameraAnimation();

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
function toggleRotation(buttonNumber) {
  if (isRotating) return; // 이미 회전 중이면 무시
  
  isRotating = true;
  
  // 모든 버튼 비활성화
  for (let i = 1; i <= 3; i++) {
    const button = document.getElementById(`rotationButton${i}`);
    const levelText = button.querySelector('.level-text');
    const startText = button.querySelector('.start-text');
    button.disabled = true;
    if (i === buttonNumber) {
      levelText.textContent = `レベル${i}`;
      startText.textContent = 'ストップ';
      // 각 버튼별 빨간색 그라데이션 (활성화 상태)
      if (i === 1) {
        button.style.background = 'linear-gradient(145deg, #e53e3e 0%, #c53030 100%)';
      } else if (i === 2) {
        button.style.background = 'linear-gradient(145deg, #dc2626 0%, #b91c1c 100%)';
      } else if (i === 3) {
        button.style.background = 'linear-gradient(145deg, #ef4444 0%, #dc2626 100%)';
      }
    } else {
      button.style.background = 'linear-gradient(145deg, #4a5568 0%, #2d3748 100%)';
    }
  }
  
  // 기존 공과 말풍선 삭제
  if (sphere) {
    scene.remove(sphere);
  }
  
  // 기존 말풍선과 화살표 제거
  if (window.currentArrow) {
    scene.remove(window.currentArrow.group);
    while (window.currentArrow.group.children.length > 0) {
      const child = window.currentArrow.group.children[0];
      window.currentArrow.group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    window.currentArrow = null;
  }
  
  // 기존 말풍선 스프라이트 제거
  const existingSprites = scene.children.filter(child => child instanceof THREE.Sprite);
  existingSprites.forEach(sprite => {
    scene.remove(sprite);
    if (sprite.material.map) {
      sprite.material.map.dispose();
    }
    sprite.material.dispose();
  });
  
  // 버튼별 확률에 따라 구슬 색상 설정
  let isWinner = false;
  let sphereColor = 0x4444ff; // 기본값: 파란색(꽝)
  
  if (buttonNumber === 1) {
    // 버튼 1: 1/3 확률
    isWinner = Math.random() < 1/3;
  } else if (buttonNumber === 2) {
    // 버튼 2: 1/2 확률
    isWinner = Math.random() < 1/2;
  } else if (buttonNumber === 3) {
    // 버튼 3: 1/1 확률 (100%)
    isWinner = true;
  }
  
  sphereColor = isWinner ? 0xff4444 : 0x4444ff;
  
  // 새로운 공 생성
  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  sphereGeo.computeBoundingSphere();
  
  const sphereMat = new THREE.MeshPhongMaterial({ color: sphereColor, shininess: 80 });
  
  sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(0, 5, 0);
  sphere.userData = {
    inside: true,
    localPos: new THREE.Vector3(0, 0, 0),
    isWinner: isWinner,
    showedResult: false
  };
  sphere.velocity = new THREE.Vector3(0, 0, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);
  
  // emitted 상태 초기화
  emitted = false;
  
  angularVelocity = Math.max(angularVelocity, 0.06);
  
  // 1-4초 사이 랜덤하게 공 배출
  const emitDelay = Math.random() * 3000 + 1000; // 1000-4000ms
  emitTimer = setTimeout(() => {
    if (isRotating && !emitted && sphere && sphere.userData.inside) {
      emitted = true;
      emitBall(sphere);
    }
  }, emitDelay);
  
  // 2-5초 사이 랜덤하게 자동으로 STOP
  const randomDelay = Math.random() * 3000 + 2000; // 2000-5000ms
  autoStopTimer = setTimeout(() => {
    autoStop();
  }, randomDelay);
}

// 자동 STOP 함수
function autoStop() {
  isRotating = false;
  angularVelocity *= 0.5; // 급격히 감속
  
  // 모든 버튼을 원래 상태로 복원
  for (let i = 1; i <= 3; i++) {
    const button = document.getElementById(`rotationButton${i}`);
    const levelText = button.querySelector('.level-text');
    const startText = button.querySelector('.start-text');
    levelText.textContent = `レベル${i}`;
    startText.textContent = 'スタート';
    // 각 버튼별 기본 색상 복원
    if (i === 1) {
      button.style.background = 'linear-gradient(145deg, #667eea 0%, #764ba2 100%)';
    } else if (i === 2) {
      button.style.background = 'linear-gradient(145deg, #f093fb 0%, #f5576c 100%)';
    } else if (i === 3) {
      button.style.background = 'linear-gradient(145deg, #4facfe 0%, #00f2fe 100%)';
    }
    button.disabled = false;
  }
  
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  
  if (emitTimer) {
    clearTimeout(emitTimer);
    emitTimer = null;
  }
}


// 초기화
window.addEventListener('load', init);
