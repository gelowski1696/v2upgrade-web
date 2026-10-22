import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from 'three';

export const LPG_PALETTE = {
  gold: 0xd79b24,
  goldLight: 0xf0bc50,
  charcoal: 0x24211d,
  dark: 0x15130f,
  ivory: 0xeee5d7,
  concrete: 0xcfc5b5,
  metal: 0xaaa9a3,
  glass: 0x42606a,
  rubber: 0x181817,
  safetyRed: 0xb7432f,
  green: 0x576e43,
  timber: 0x8a6035,
} as const;

export interface VehicleModel {
  group: Group;
  wheels: Mesh[];
}

export interface ForkliftModel extends VehicleModel {
  carriage: Group;
}

export class LpgModelFactory {
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly textures = new Set<CanvasTexture>();
  private readonly gold = this.standard(LPG_PALETTE.gold, 0.58, 0.08);
  private readonly goldLight = this.standard(LPG_PALETTE.goldLight, 0.52, 0.06);
  private readonly charcoal = this.standard(LPG_PALETTE.charcoal, 0.82, 0.04);
  private readonly dark = this.standard(LPG_PALETTE.dark, 0.88, 0.02);
  private readonly ivory = this.standard(LPG_PALETTE.ivory, 0.88, 0.02);
  private readonly concrete = this.standard(LPG_PALETTE.concrete, 0.96, 0);
  private readonly metal = this.standard(LPG_PALETTE.metal, 0.36, 0.58);
  private readonly glass = this.standard(LPG_PALETTE.glass, 0.2, 0.28);
  private readonly rubber = this.standard(LPG_PALETTE.rubber, 0.98, 0);
  private readonly red = this.standard(LPG_PALETTE.safetyRed, 0.68, 0.02);
  private readonly green = this.standard(LPG_PALETTE.green, 0.92, 0);
  private readonly timber = this.standard(LPG_PALETTE.timber, 0.86, 0);
  private readonly whiteLight = this.basic(0xfff1c9);
  private readonly redLight = this.basic(0xe74f38);

  createCylinder(state: 'filled' | 'empty' = 'filled', scale = 1): Group {
    const group = new Group();
    const shell = state === 'filled' ? this.gold : this.metal;
    const body = this.mesh(new CylinderGeometry(0.13, 0.145, 0.42, 12), shell);
    body.position.y = 0.23;
    group.add(body);

    const shoulder = this.mesh(new SphereGeometry(0.13, 12, 7), shell);
    shoulder.scale.set(1, 0.48, 1);
    shoulder.position.y = 0.43;
    group.add(shoulder);

    const neck = this.mesh(new CylinderGeometry(0.048, 0.065, 0.1, 10), this.dark);
    neck.position.y = 0.53;
    group.add(neck);

    const handle = this.mesh(new TorusGeometry(0.075, 0.017, 5, 10, Math.PI * 1.55), shell);
    handle.position.set(0, 0.585, 0);
    handle.rotation.z = Math.PI * 0.22;
    group.add(handle);
    group.scale.setScalar(scale);
    return group;
  }

  createCylinderRack(options: {
    rows: number;
    columns: number;
    state: 'filled' | 'empty';
    label: string;
  }): Group {
    const { rows, columns, state, label } = options;
    const group = new Group();
    const width = Math.max(1.4, columns * 0.31 + 0.24);
    const depth = Math.max(0.72, rows * 0.36 + 0.2);
    const shell = state === 'filled' ? this.gold : this.metal;
    const count = rows * columns;

    const bodyGeometry = this.geometry(new CylinderGeometry(0.105, 0.118, 0.38, 10));
    const shoulderGeometry = this.geometry(new SphereGeometry(0.105, 9, 6));
    shoulderGeometry.scale(1, 0.46, 1);
    const neckGeometry = this.geometry(new CylinderGeometry(0.04, 0.052, 0.08, 8));
    const bodies = new InstancedMesh(bodyGeometry, shell, count);
    const shoulders = new InstancedMesh(shoulderGeometry, shell, count);
    const necks = new InstancedMesh(neckGeometry, this.dark, count);
    const matrix = new Matrix4();
    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = -width / 2 + 0.28 + column * 0.31;
        const z = -depth / 2 + 0.25 + row * 0.36;
        matrix.makeTranslation(x, 0.22, z);
        bodies.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 0.4, z);
        shoulders.setMatrixAt(index, matrix);
        matrix.makeTranslation(x, 0.49, z);
        necks.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    bodies.castShadow = true;
    shoulders.castShadow = true;
    group.add(bodies, shoulders, necks);

    const frameMaterial = state === 'filled' ? this.charcoal : this.gold;
    for (const x of [-width / 2, width / 2]) {
      for (const z of [-depth / 2, depth / 2]) {
        const post = this.box(0.055, 0.8, 0.055, frameMaterial);
        post.position.set(x, 0.4, z);
        group.add(post);
      }
    }
    for (const y of [0.06, 0.68]) {
      const front = this.box(width + 0.08, 0.055, 0.055, frameMaterial);
      front.position.set(0, y, depth / 2);
      const back = front.clone();
      back.position.z = -depth / 2;
      group.add(front, back);
      const left = this.box(0.055, 0.055, depth, frameMaterial);
      left.position.set(-width / 2, y, 0);
      const right = left.clone();
      right.position.x = width / 2;
      group.add(left, right);
    }
    const sign = this.createLabel(label, state === 'filled' ? '#d79b24' : '#292621', '#fff7e7');
    sign.scale.set(0.9, 0.22, 1);
    sign.position.set(0, 0.86, depth / 2 + 0.035);
    group.add(sign);
    return group;
  }

  createDepot(): Group {
    const group = new Group();
    const shell = this.box(5.15, 2.45, 3.45, this.charcoal);
    shell.position.y = 1.23;
    group.add(shell);

    const roof = this.box(5.45, 0.18, 3.75, this.gold);
    roof.position.y = 2.54;
    group.add(roof);
    for (const x of [-1.9, 0, 1.9]) {
      const skylight = this.box(1.1, 0.09, 2.65, this.metal);
      skylight.position.set(x, 2.67, 0);
      group.add(skylight);
    }

    for (const x of [-1.48, 0.2]) {
      const shutter = this.box(1.28, 1.65, 0.08, this.metal);
      shutter.position.set(x, 0.84, 1.765);
      group.add(shutter);
      for (let y = 0.18; y < 1.52; y += 0.2) {
        const line = this.box(1.16, 0.018, 0.015, this.charcoal);
        line.position.set(x, y + 0.08, 1.815);
        group.add(line);
      }
    }

    const office = this.box(1.22, 1.65, 0.12, this.ivory);
    office.position.set(1.73, 0.84, 1.78);
    group.add(office);
    const window = this.box(0.82, 0.58, 0.035, this.glass);
    window.position.set(1.73, 1.06, 1.855);
    group.add(window);
    const sign = this.createLabel('VMJAM LPG DEPOT', '#d79b24', '#17130d');
    sign.scale.set(2.25, 0.5, 1);
    sign.position.set(0.1, 2.1, 1.84);
    group.add(sign);

    const vent = this.mesh(new CylinderGeometry(0.17, 0.2, 0.5, 10), this.metal);
    vent.position.set(1.95, 2.92, -0.5);
    group.add(vent);
    return group;
  }

  createRetailStore(label = 'BRANCH 01'): Group {
    const group = new Group();
    const shell = this.box(2.7, 1.65, 2.15, this.ivory);
    shell.position.y = 0.83;
    group.add(shell);
    const roof = this.box(2.94, 0.14, 2.38, this.charcoal);
    roof.position.y = 1.72;
    group.add(roof);

    const fascia = this.box(2.56, 0.34, 0.22, this.gold);
    fascia.position.set(0, 1.42, 1.16);
    group.add(fascia);
    const sign = this.createLabel(label, '#d79b24', '#17130d');
    sign.scale.set(1.4, 0.28, 1);
    sign.position.set(0, 1.43, 1.29);
    group.add(sign);

    const window = this.box(1.28, 0.78, 0.06, this.glass);
    window.position.set(-0.48, 0.72, 1.105);
    group.add(window);
    const door = this.box(0.56, 1.18, 0.07, this.charcoal);
    door.position.set(0.86, 0.6, 1.11);
    group.add(door);
    const canopy = this.box(2.35, 0.1, 0.62, this.gold);
    canopy.position.set(0, 1.22, 1.35);
    group.add(canopy);
    return group;
  }

  createDeliveryTruck(): VehicleModel {
    const truck = new Group();
    const wheels: Mesh[] = [];

    const chassis = this.box(1.35, 0.18, 3.25, this.charcoal);
    chassis.position.y = 0.32;
    truck.add(chassis);
    const cab = this.box(1.32, 1.12, 1.18, this.gold);
    cab.position.set(0, 0.93, 1.02);
    truck.add(cab);
    const hood = this.box(1.32, 0.48, 0.54, this.goldLight);
    hood.position.set(0, 0.62, 1.86);
    truck.add(hood);
    const windscreen = this.box(1.06, 0.46, 0.035, this.glass);
    windscreen.position.set(0, 1.15, 1.62);
    windscreen.rotation.x = -0.12;
    truck.add(windscreen);

    const cageFloor = this.box(1.32, 0.12, 1.85, this.gold);
    cageFloor.position.set(0, 0.54, -0.66);
    truck.add(cageFloor);
    for (const x of [-0.62, 0.62]) {
      for (const z of [-1.48, 0.15]) {
        const post = this.box(0.055, 1.25, 0.055, this.gold);
        post.position.set(x, 1.14, z);
        truck.add(post);
      }
    }
    for (const y of [0.67, 1.28, 1.74]) {
      const sideLeft = this.box(0.055, 0.055, 1.72, this.gold);
      sideLeft.position.set(-0.62, y, -0.66);
      const sideRight = sideLeft.clone();
      sideRight.position.x = 0.62;
      truck.add(sideLeft, sideRight);
      const back = this.box(1.3, 0.055, 0.055, this.gold);
      back.position.set(0, y, -1.49);
      truck.add(back);
    }
    for (const x of [-0.38, 0, 0.38]) {
      const cylinder = this.createCylinder('filled', 0.78);
      cylinder.position.set(x, 0.55, -0.62);
      truck.add(cylinder);
    }

    this.addTruckDetails(truck, wheels, [-1.08, 1.08]);
    return { group: truck, wheels };
  }

  createSupplierTanker(): VehicleModel {
    const truck = new Group();
    const wheels: Mesh[] = [];
    const chassis = this.box(1.52, 0.2, 4.35, this.charcoal);
    chassis.position.y = 0.34;
    truck.add(chassis);

    const cab = this.box(1.5, 1.28, 1.25, this.gold);
    cab.position.set(0, 1, 1.5);
    truck.add(cab);
    const nose = this.box(1.5, 0.55, 0.5, this.goldLight);
    nose.position.set(0, 0.69, 2.25);
    truck.add(nose);
    const windscreen = this.box(1.2, 0.48, 0.04, this.glass);
    windscreen.position.set(0, 1.27, 2.13);
    truck.add(windscreen);

    const tank = this.mesh(new CylinderGeometry(0.72, 0.72, 2.62, 20), this.metal);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.18, -0.65);
    truck.add(tank);
    for (const z of [-1.55, -0.65, 0.25]) {
      const ring = this.mesh(new TorusGeometry(0.735, 0.035, 7, 22), this.gold);
      ring.position.set(0, 1.18, z);
      truck.add(ring);
    }
    const topRail = this.box(0.08, 0.08, 2.25, this.gold);
    topRail.position.set(0, 1.94, -0.65);
    truck.add(topRail);
    const hazard = this.box(0.34, 0.34, 0.04, this.red);
    hazard.rotation.z = Math.PI / 4;
    hazard.position.set(0, 1.18, -2.01);
    truck.add(hazard);

    this.addTruckDetails(truck, wheels, [-1.55, -0.62, 1.38]);
    return { group: truck, wheels };
  }

  createForklift(): ForkliftModel {
    const group = new Group();
    const wheels: Mesh[] = [];
    const body = this.box(0.86, 0.58, 1.1, this.gold);
    body.position.set(0, 0.52, -0.18);
    group.add(body);
    const counterweight = this.mesh(new CylinderGeometry(0.43, 0.43, 0.82, 10), this.goldLight);
    counterweight.rotation.z = Math.PI / 2;
    counterweight.position.set(0, 0.55, -0.57);
    group.add(counterweight);
    const seat = this.box(0.42, 0.45, 0.38, this.charcoal);
    seat.position.set(0, 0.95, -0.2);
    group.add(seat);

    for (const x of [-0.39, 0.39]) {
      for (const z of [-0.42, 0.36]) {
        const wheel = this.createWheel(0.23, 0.16);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.25, z);
        group.add(wheel);
        wheels.push(wheel);
      }
    }
    for (const x of [-0.38, 0.38]) {
      const guard = this.box(0.045, 1.18, 0.045, this.charcoal);
      guard.position.set(x, 1.14, -0.03);
      group.add(guard);
    }
    const roof = this.box(0.86, 0.06, 0.78, this.charcoal);
    roof.position.set(0, 1.72, -0.03);
    group.add(roof);

    const carriage = new Group();
    for (const x of [-0.36, 0.36]) {
      const mast = this.box(0.07, 1.75, 0.08, this.charcoal);
      mast.position.set(x, 0.88, 0.67);
      carriage.add(mast);
      const fork = this.box(0.08, 0.06, 1.0, this.metal);
      fork.position.set(x, 0.14, 1.1);
      carriage.add(fork);
    }
    group.add(carriage);
    return { group, wheels, carriage };
  }

  createStorageTank(): Group {
    const group = new Group();
    const tank = this.mesh(new CylinderGeometry(0.68, 0.68, 3.35, 20), this.metal);
    tank.rotation.z = Math.PI / 2;
    tank.position.y = 1.05;
    group.add(tank);
    for (const x of [-1.1, 1.1]) {
      const support = this.box(0.2, 0.74, 0.82, this.charcoal);
      support.position.set(x, 0.38, 0);
      group.add(support);
      const band = this.mesh(new TorusGeometry(0.695, 0.035, 6, 20), this.gold);
      band.rotation.y = Math.PI / 2;
      band.position.set(x, 1.05, 0);
      group.add(band);
    }
    const valve = this.mesh(new CylinderGeometry(0.08, 0.08, 0.24, 8), this.red);
    valve.position.set(0.4, 1.82, 0);
    group.add(valve);
    const label = this.createLabel('LPG', '#d79b24', '#17130d');
    label.scale.set(0.55, 0.28, 1);
    label.position.set(0, 1.08, 0.695);
    group.add(label);
    return group;
  }

  createPallet(state: 'filled' | 'empty' = 'filled'): Group {
    const group = new Group();
    for (const z of [-0.32, 0, 0.32]) {
      const slat = this.box(1.15, 0.07, 0.18, this.timber);
      slat.position.set(0, 0.04, z);
      group.add(slat);
    }
    for (const x of [-0.38, 0.38]) {
      for (const z of [-0.2, 0.2]) {
        const cylinder = this.createCylinder(state, 0.82);
        cylinder.position.set(x, 0.08, z);
        group.add(cylinder);
      }
    }
    return group;
  }

  createHouse(color = 0xe8dfd1): Group {
    const group = new Group();
    const wallMaterial = this.standard(color, 0.9, 0);
    const shell = this.box(1.65, 1.15, 1.45, wallMaterial);
    shell.position.y = 0.58;
    group.add(shell);
    const roof = this.box(1.9, 0.18, 1.7, this.charcoal);
    roof.position.y = 1.25;
    roof.rotation.z = 0.08;
    group.add(roof);
    const door = this.box(0.38, 0.76, 0.05, this.timber);
    door.position.set(0.38, 0.39, 0.75);
    group.add(door);
    const window = this.box(0.48, 0.42, 0.05, this.glass);
    window.position.set(-0.42, 0.63, 0.75);
    group.add(window);
    return group;
  }

  createTree(scale = 1): Group {
    const group = new Group();
    const trunk = this.mesh(new CylinderGeometry(0.08, 0.11, 0.78, 7), this.timber);
    trunk.position.y = 0.39;
    group.add(trunk);
    const crown = this.mesh(new SphereGeometry(0.46, 8, 6), this.green);
    crown.scale.set(0.82, 1.15, 0.82);
    crown.position.y = 1.02;
    group.add(crown);
    group.scale.setScalar(scale);
    return group;
  }

  createStreetLight(): Group {
    const group = new Group();
    const pole = this.mesh(new CylinderGeometry(0.035, 0.045, 1.45, 7), this.charcoal);
    pole.position.y = 0.73;
    group.add(pole);
    const arm = this.box(0.42, 0.04, 0.04, this.charcoal);
    arm.position.set(0.17, 1.43, 0);
    group.add(arm);
    const lamp = this.box(0.18, 0.08, 0.12, this.whiteLight);
    lamp.position.set(0.37, 1.38, 0);
    group.add(lamp);
    return group;
  }

  createFence(length: number): Group {
    const group = new Group();
    const segments = Math.max(2, Math.ceil(length / 0.55));
    for (let index = 0; index <= segments; index += 1) {
      const post = this.box(0.045, 0.78, 0.045, this.charcoal);
      post.position.set(-length / 2 + (index / segments) * length, 0.39, 0);
      group.add(post);
    }
    for (const y of [0.22, 0.5, 0.72]) {
      const rail = this.box(length, 0.025, 0.025, this.metal);
      rail.position.y = y;
      group.add(rail);
    }
    return group;
  }

  createBollard(): Group {
    const group = new Group();
    const post = this.mesh(new CylinderGeometry(0.07, 0.08, 0.5, 8), this.gold);
    post.position.y = 0.25;
    group.add(post);
    const stripe = this.mesh(new CylinderGeometry(0.072, 0.072, 0.08, 8), this.charcoal);
    stripe.position.y = 0.3;
    group.add(stripe);
    return group;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
  }

  private addTruckDetails(truck: Group, wheels: Mesh[], axlePositions: number[]): void {
    for (const z of axlePositions) {
      for (const x of [-0.73, 0.73]) {
        const wheel = this.createWheel(0.28, 0.2);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.28, z);
        truck.add(wheel);
        wheels.push(wheel);
      }
    }
    for (const x of [-0.42, 0.42]) {
      const headlight = this.box(0.22, 0.15, 0.035, this.whiteLight);
      headlight.position.set(x, 0.64, Math.max(...axlePositions) + 0.93);
      truck.add(headlight);
      const tailLight = this.box(0.17, 0.12, 0.035, this.redLight);
      tailLight.position.set(x, 0.48, Math.min(...axlePositions) - 0.54);
      truck.add(tailLight);
    }
  }

  private createWheel(radius: number, width: number): Mesh {
    return this.mesh(new CylinderGeometry(radius, radius, width, 14), this.rubber);
  }

  private createLabel(text: string, background: string, foreground: string): Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = foreground;
      context.font = '700 52px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.textures.add(texture);
    const material = this.material(new MeshBasicMaterial({ map: texture, transparent: true }));
    return this.mesh(new PlaneGeometry(1, 1), material);
  }

  private box(width: number, height: number, depth: number, material: Material): Mesh {
    return this.mesh(new BoxGeometry(width, height, depth), material);
  }

  private mesh<TGeometry extends BufferGeometry, TMaterial extends Material>(
    geometry: TGeometry,
    material: TMaterial,
  ): Mesh<TGeometry, TMaterial> {
    this.geometry(geometry);
    this.material(material);
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private standard(color: number, roughness: number, metalness: number): MeshStandardMaterial {
    return this.material(new MeshStandardMaterial({ color, roughness, metalness }));
  }

  private basic(color: number): MeshBasicMaterial {
    return this.material(new MeshBasicMaterial({ color }));
  }

  private geometry<T extends BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private material<T extends Material>(material: T): T {
    this.materials.add(material);
    return material;
  }
}
