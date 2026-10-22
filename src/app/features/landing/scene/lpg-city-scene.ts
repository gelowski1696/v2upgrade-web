import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Timer,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { ForkliftModel, LPG_PALETTE, LpgModelFactory, VehicleModel } from './lpg-models';

interface CameraFrame {
  at: number;
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

const CAMERA_FRAMES: CameraFrame[] = [
  { at: 0, position: [15, 15, 18], target: [0, 0.3, 0], zoom: 0.92 },
  { at: 0.16, position: [-11, 8.5, 10], target: [-6.2, 0.5, -2.1], zoom: 1.42 },
  { at: 0.32, position: [-3.5, 7.2, 8.8], target: [-1.5, 0.4, 0.2], zoom: 1.62 },
  { at: 0.49, position: [6.5, 7.4, 9.3], target: [4.6, 0.4, -1.7], zoom: 1.58 },
  { at: 0.65, position: [9.2, 7.8, 11.8], target: [5.8, 0.35, 3.8], zoom: 1.46 },
  { at: 0.82, position: [9.5, 10.8, 14], target: [1.2, 0.3, 5.4], zoom: 1.18 },
  { at: 1, position: [14, 15.5, 19], target: [0, 0.25, 0], zoom: 0.86 },
];

export class LpgCityScene {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-8, 8, 6, -6, 0.1, 80);
  private readonly renderer: WebGLRenderer;
  private readonly world = new Group();
  private readonly models = new LpgModelFactory();
  private readonly timer = new Timer();
  private readonly materials = new Set<Material>();
  private readonly geometries = new Set<BufferGeometry>();
  private readonly deliveryTruck: VehicleModel;
  private readonly supplierTanker: VehicleModel;
  private readonly forklift: ForkliftModel;
  private readonly deliveryPath: CatmullRomCurve3;
  private readonly tankerPath: CatmullRomCurve3;
  private readonly forkliftPath: CatmullRomCurve3;
  private readonly gateArms: Group[] = [];
  private readonly beacons: Object3D[] = [];
  private readonly activityLights: Object3D[] = [];
  private baseFrustum = 17;
  private progress = 0;
  private branchReveal = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, mobile: boolean) {
    this.scene.background = new Color(0xeee5d7);
    this.scene.fog = new Fog(0xeee5d7, 22, 43);
    this.scene.add(this.world);
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: false,
      antialias: !mobile,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0xeee5d7, 1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = !mobile;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.15 : 1.5));

    this.addLights(mobile);
    this.buildBase();
    this.buildRoadNetwork();
    this.buildSupplyCompound();
    this.buildDepotAndCylinderYard(mobile);
    this.buildRetailAndDispatch();
    this.buildBranchNetwork(mobile);
    this.buildStreetDetails(mobile);

    this.supplierTanker = this.models.createSupplierTanker();
    this.supplierTanker.group.scale.setScalar(0.74);
    this.world.add(this.supplierTanker.group);
    this.tankerPath = new CatmullRomCurve3(
      [
        new Vector3(-11.8, 0.17, 4.15),
        new Vector3(-9.2, 0.17, 4.15),
        new Vector3(-7.45, 0.17, 3.35),
        new Vector3(-6.85, 0.17, 1.75),
      ],
      false,
      'catmullrom',
      0.35,
    );

    this.deliveryTruck = this.models.createDeliveryTruck();
    this.deliveryTruck.group.scale.setScalar(0.72);
    this.world.add(this.deliveryTruck.group);
    this.deliveryPath = new CatmullRomCurve3(
      [
        new Vector3(3.65, 0.17, 0.1),
        new Vector3(5.7, 0.17, 1.15),
        new Vector3(6.1, 0.17, 3.8),
        new Vector3(4.9, 0.17, 4.7),
        new Vector3(1.2, 0.17, 4.7),
        new Vector3(-1.4, 0.17, 5.15),
      ],
      false,
      'catmullrom',
      0.42,
    );

    this.forklift = this.models.createForklift();
    this.forklift.group.scale.setScalar(0.72);
    const pallet = this.models.createPallet('filled');
    pallet.scale.setScalar(0.62);
    pallet.position.set(0, 0.1, 1.05);
    this.forklift.carriage.add(pallet);
    this.world.add(this.forklift.group);
    this.forkliftPath = new CatmullRomCurve3(
      [
        new Vector3(-0.8, 0.15, -0.45),
        new Vector3(-1.25, 0.15, 0.25),
        new Vector3(-2.25, 0.15, 1.12),
      ],
      false,
      'catmullrom',
      0.35,
    );

    this.setProgress(0);
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const aspect = this.width / this.height;
    this.baseFrustum = aspect < 0.8 ? 22 : aspect < 1.2 ? 19 : 17;
    this.camera.left = (-this.baseFrustum * aspect) / 2;
    this.camera.right = (this.baseFrustum * aspect) / 2;
    this.camera.top = this.baseFrustum / 2;
    this.camera.bottom = -this.baseFrustum / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  setProgress(value: number): void {
    this.progress = Math.min(1, Math.max(0, value));
    this.updateCamera();

    const tankerProgress = this.range(this.progress, 0.08, 0.27);
    this.moveVehicle(this.supplierTanker, this.tankerPath, tankerProgress, 22);

    const forkliftProgress = this.range(this.progress, 0.27, 0.45);
    this.moveVehicle(this.forklift, this.forkliftPath, forkliftProgress, 19);
    this.forklift.carriage.position.y = Math.sin(forkliftProgress * Math.PI) * 0.22;

    const deliveryProgress = this.range(this.progress, 0.46, 0.76);
    this.moveVehicle(this.deliveryTruck, this.deliveryPath, deliveryProgress, 36);

    const gateOpen = this.smooth(this.range(this.progress, 0.06, 0.14));
    for (let index = 0; index < this.gateArms.length; index += 1) {
      this.gateArms[index].rotation.y = (index === 0 ? -1 : 1) * gateOpen * Math.PI * 0.48;
    }
    this.branchReveal = this.smooth(this.range(this.progress, 0.69, 0.86));
  }

  render(animate: boolean): void {
    if (animate) {
      this.timer.update();
      const elapsed = this.timer.getElapsed();
      for (let index = 0; index < this.beacons.length; index += 1) {
        const pulse = 0.84 + Math.sin(elapsed * 2.2 + index * 0.8) * 0.13;
        this.beacons[index].scale.setScalar(Math.max(0.001, this.branchReveal * pulse));
        this.beacons[index].rotation.y = elapsed * 0.45;
      }
      for (let index = 0; index < this.activityLights.length; index += 1) {
        const pulse = 0.92 + Math.sin(elapsed * 3.4 + index) * 0.08;
        this.activityLights[index].scale.setScalar(pulse);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.models.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private buildBase(): void {
    const plinth = this.mesh(
      new BoxGeometry(20.5, 0.62, 15.2),
      new MeshStandardMaterial({ color: 0xb8aa96, roughness: 0.94 }),
    );
    plinth.position.y = -0.44;
    this.world.add(plinth);
    const ground = this.mesh(
      new BoxGeometry(20, 0.12, 14.7),
      new MeshStandardMaterial({ color: 0xeee5d7, roughness: 1 }),
    );
    ground.position.y = -0.08;
    this.world.add(ground);

    const inset = this.mesh(
      new BoxGeometry(19.5, 0.035, 14.2),
      new MeshStandardMaterial({ color: 0xe8dece, roughness: 1 }),
    );
    inset.position.y = 0;
    this.world.add(inset);
  }

  private buildRoadNetwork(): void {
    const roadMaterial = this.material(
      new MeshStandardMaterial({ color: 0x37342f, roughness: 0.98 }),
    );
    const curbMaterial = this.material(
      new MeshStandardMaterial({ color: 0xd8cdbc, roughness: 0.96 }),
    );
    const lineMaterial = this.material(new MeshBasicMaterial({ color: LPG_PALETTE.gold }));

    const mainRoad = this.mesh(new BoxGeometry(18.9, 0.09, 2.2), roadMaterial);
    mainRoad.position.set(0, 0.03, 4.45);
    this.world.add(mainRoad);
    const crossRoad = this.mesh(new BoxGeometry(2.2, 0.09, 9.2), roadMaterial);
    crossRoad.position.set(6.05, 0.03, 0.9);
    this.world.add(crossRoad);
    const supplyRoad = this.mesh(new BoxGeometry(6.1, 0.09, 1.7), roadMaterial);
    supplyRoad.position.set(-6.85, 0.035, 2.35);
    supplyRoad.rotation.y = -0.22;
    this.world.add(supplyRoad);

    for (const z of [3.27, 5.62]) {
      const curb = this.mesh(new BoxGeometry(19.25, 0.14, 0.12), curbMaterial);
      curb.position.set(0, 0.1, z);
      this.world.add(curb);
    }
    for (const x of [4.88, 7.22]) {
      const curb = this.mesh(new BoxGeometry(0.12, 0.14, 6.55), curbMaterial);
      curb.position.set(x, 0.1, 0.05);
      this.world.add(curb);
    }

    for (let x = -8.4; x <= 8.4; x += 1.45) {
      const dash = this.mesh(new BoxGeometry(0.72, 0.025, 0.065), lineMaterial);
      dash.position.set(x, 0.09, 4.45);
      this.world.add(dash);
    }
    for (let z = -2.6; z <= 3; z += 1.35) {
      const dash = this.mesh(new BoxGeometry(0.065, 0.025, 0.65), lineMaterial);
      dash.position.set(6.05, 0.09, z);
      this.world.add(dash);
    }

    const crossingMaterial = this.material(new MeshBasicMaterial({ color: 0xf2eadc }));
    for (let index = -3; index <= 3; index += 1) {
      const stripe = this.mesh(new BoxGeometry(0.18, 0.025, 1.55), crossingMaterial);
      stripe.position.set(4.1 + index * 0.3, 0.095, 4.45);
      this.world.add(stripe);
    }
  }

  private buildSupplyCompound(): void {
    const tankA = this.models.createStorageTank();
    tankA.position.set(-6.9, 0, -3.85);
    this.world.add(tankA);
    const tankB = this.models.createStorageTank();
    tankB.position.set(-6.9, 0, -2.05);
    this.world.add(tankB);

    const backFence = this.models.createFence(7.2);
    backFence.position.set(-6.25, 0, -5.15);
    this.world.add(backFence);
    for (const x of [-9.7, -2.75]) {
      const side = this.models.createFence(4.6);
      side.rotation.y = Math.PI / 2;
      side.position.set(x, 0, -2.85);
      this.world.add(side);
    }

    const weighBridge = this.mesh(
      new BoxGeometry(3.4, 0.12, 1.25),
      new MeshStandardMaterial({ color: 0x77736d, roughness: 0.72, metalness: 0.38 }),
    );
    weighBridge.position.set(-6.75, 0.12, 1.4);
    weighBridge.rotation.y = -0.22;
    this.world.add(weighBridge);
    for (const x of [-8.9, -5.55]) {
      const post = this.mesh(
        new CylinderGeometry(0.075, 0.09, 1.25, 8),
        new MeshStandardMaterial({ color: LPG_PALETTE.charcoal, roughness: 0.8 }),
      );
      post.position.set(x, 0.62, 2.4);
      this.world.add(post);
      const armGroup = new Group();
      armGroup.position.set(x, 1.12, 2.4);
      const arm = this.mesh(
        new BoxGeometry(1.8, 0.08, 0.1),
        new MeshStandardMaterial({ color: LPG_PALETTE.gold, roughness: 0.64 }),
      );
      arm.position.x = x < -7 ? 0.9 : -0.9;
      armGroup.add(arm);
      this.gateArms.push(armGroup);
      this.world.add(armGroup);
    }
    for (let index = 0; index < 5; index += 1) {
      const bollard = this.models.createBollard();
      bollard.position.set(-3.4 + index * 0.38, 0, -4.55);
      this.world.add(bollard);
    }
  }

  private buildDepotAndCylinderYard(mobile: boolean): void {
    const depot = this.models.createDepot();
    depot.scale.setScalar(0.88);
    depot.position.set(-0.45, 0, -3.28);
    this.world.add(depot);

    const filledRack = this.models.createCylinderRack({
      rows: mobile ? 2 : 3,
      columns: mobile ? 5 : 7,
      state: 'filled',
      label: 'FILLED',
    });
    filledRack.position.set(-2.3, 0, 0.2);
    this.world.add(filledRack);

    const emptyRack = this.models.createCylinderRack({
      rows: mobile ? 2 : 3,
      columns: mobile ? 5 : 7,
      state: 'empty',
      label: 'EMPTY',
    });
    emptyRack.position.set(0.25, 0, 0.2);
    this.world.add(emptyRack);

    const safetyZoneMaterial = this.material(new MeshBasicMaterial({ color: 0xc89020 }));
    for (const x of [-3.45, -1.15, 1.38]) {
      const line = this.mesh(new BoxGeometry(0.045, 0.018, 2.15), safetyZoneMaterial);
      line.position.set(x, 0.07, 0.15);
      this.world.add(line);
    }
    for (const z of [-0.92, 1.22]) {
      const line = this.mesh(new BoxGeometry(4.85, 0.018, 0.045), safetyZoneMaterial);
      line.position.set(-1.03, 0.07, z);
      this.world.add(line);
    }

    const loosePallet = this.models.createPallet('empty');
    loosePallet.scale.setScalar(0.72);
    loosePallet.position.set(1.95, 0.02, -0.25);
    this.world.add(loosePallet);
  }

  private buildRetailAndDispatch(): void {
    const store = this.models.createRetailStore('VMJAM LPG STORE');
    store.position.set(4.45, 0, -3.35);
    this.world.add(store);

    for (let index = 0; index < 4; index += 1) {
      const cylinder = this.models.createCylinder('filled', 0.82);
      cylinder.position.set(3.75 + index * 0.28, 0.02, -1.96);
      this.world.add(cylinder);
    }
    for (let index = 0; index < 4; index += 1) {
      const bollard = this.models.createBollard();
      bollard.position.set(2.95 + index * 0.48, 0, -1.66);
      this.world.add(bollard);
    }

    const dispatchCanopy = this.mesh(
      new BoxGeometry(2.8, 0.13, 1.4),
      new MeshStandardMaterial({ color: LPG_PALETTE.gold, roughness: 0.62 }),
    );
    dispatchCanopy.position.set(2.55, 1.62, -0.65);
    this.world.add(dispatchCanopy);
    for (const x of [1.3, 3.8]) {
      for (const z of [-1.16, -0.14]) {
        const post = this.mesh(
          new BoxGeometry(0.07, 1.6, 0.07),
          new MeshStandardMaterial({ color: LPG_PALETTE.charcoal, roughness: 0.8 }),
        );
        post.position.set(x, 0.8, z);
        this.world.add(post);
      }
    }
  }

  private buildBranchNetwork(mobile: boolean): void {
    const positions: Array<[number, number, number]> = [
      [-6.15, 0, 6.25],
      [0.3, 0, 6.15],
      [7.75, 0, 5.65],
    ];
    positions.forEach((position, index) => {
      const branch =
        index === 2
          ? this.models.createHouse(0xe0d6c6)
          : this.models.createRetailStore(`BRANCH 0${index + 2}`);
      branch.scale.setScalar(index === 2 ? 0.8 : 0.62);
      branch.position.set(...position);
      branch.rotation.y = index === 0 ? 0.08 : index === 2 ? -Math.PI / 2 : 0;
      this.world.add(branch);

      const beacon = new Group();
      const core = this.mesh(
        new SphereGeometry(mobile ? 0.1 : 0.14, 10, 8),
        new MeshBasicMaterial({ color: LPG_PALETTE.goldLight }),
      );
      const ring = this.mesh(
        new TorusGeometry(mobile ? 0.22 : 0.3, 0.025, 5, 18),
        new MeshBasicMaterial({ color: LPG_PALETTE.gold }),
      );
      ring.rotation.x = Math.PI / 2;
      beacon.add(core, ring);
      beacon.position.set(position[0], 2.35, position[2]);
      beacon.scale.setScalar(0.001);
      this.beacons.push(beacon);
      this.world.add(beacon);
    });
  }

  private buildStreetDetails(mobile: boolean): void {
    const lampPositions: Array<[number, number, number, number]> = [
      [-8.1, 0, 3.05, 0],
      [-3.8, 0, 5.82, Math.PI],
      [1.8, 0, 3.05, 0],
      [7.42, 0, 2.65, -Math.PI / 2],
    ];
    if (!mobile) lampPositions.push([7.42, 0, -1.2, -Math.PI / 2]);
    for (const [x, y, z, rotation] of lampPositions) {
      const light = this.models.createStreetLight();
      light.position.set(x, y, z);
      light.rotation.y = rotation;
      this.world.add(light);
      this.activityLights.push(light.children.at(-1)!);
    }

    const treePositions: Array<[number, number, number, number]> = [
      [-9.15, 0, -5.9, 0.92],
      [-4.1, 0, -6.0, 0.78],
      [2.45, 0, -5.85, 0.88],
      [8.95, 0, -4.8, 0.8],
      [9.1, 0, 1.8, 0.72],
      [-8.65, 0, 6.25, 0.72],
      [3.65, 0, 6.35, 0.66],
    ];
    if (!mobile) treePositions.push([-4.4, 0, 2.8, 0.64], [8.7, 0, 6.1, 0.72]);
    for (const [x, y, z, scale] of treePositions) {
      const tree = this.models.createTree(scale);
      tree.position.set(x, y, z);
      this.world.add(tree);
    }
  }

  private addLights(mobile: boolean): void {
    this.scene.add(new HemisphereLight(0xfff6e6, 0x4b4740, 2.4));
    const sun = new DirectionalLight(0xffeed0, 3.35);
    sun.position.set(-10, 17, 12);
    sun.castShadow = !mobile;
    sun.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024);
    sun.shadow.camera.left = -13;
    sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 11;
    sun.shadow.camera.bottom = -11;
    sun.shadow.bias = -0.00045;
    this.scene.add(sun);
  }

  private updateCamera(): void {
    const [from, to] = this.cameraFramePair(this.progress);
    const span = Math.max(0.0001, to.at - from.at);
    const local = this.smooth((this.progress - from.at) / span);
    const position = new Vector3(...from.position).lerp(new Vector3(...to.position), local);
    const target = new Vector3(...from.target).lerp(new Vector3(...to.target), local);
    this.camera.position.copy(position);
    this.camera.zoom = MathUtils.lerp(from.zoom, to.zoom, local);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  private moveVehicle(
    vehicle: VehicleModel,
    path: CatmullRomCurve3,
    pathProgress: number,
    wheelTurns: number,
  ): void {
    const point = path.getPointAt(pathProgress);
    const tangent = path.getTangentAt(Math.min(0.999, pathProgress));
    vehicle.group.position.copy(point);
    vehicle.group.rotation.y = Math.atan2(tangent.x, tangent.z);
    for (const wheel of vehicle.wheels) wheel.rotation.x = -pathProgress * wheelTurns;
  }

  private cameraFramePair(progress: number): [CameraFrame, CameraFrame] {
    for (let index = 0; index < CAMERA_FRAMES.length - 1; index += 1) {
      if (progress <= CAMERA_FRAMES[index + 1].at) {
        return [CAMERA_FRAMES[index], CAMERA_FRAMES[index + 1]];
      }
    }
    return [CAMERA_FRAMES.at(-2)!, CAMERA_FRAMES.at(-1)!];
  }

  private range(value: number, start: number, end: number): number {
    return Math.min(1, Math.max(0, (value - start) / Math.max(0.0001, end - start)));
  }

  private smooth(value: number): number {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
  }

  private mesh<TGeometry extends BufferGeometry, TMaterial extends Material>(
    geometry: TGeometry,
    material: TMaterial,
  ): Mesh<TGeometry, TMaterial> {
    this.geometries.add(geometry);
    this.materials.add(material);
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private material<T extends Material>(material: T): T {
    this.materials.add(material);
    return material;
  }
}
