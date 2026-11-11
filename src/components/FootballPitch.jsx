
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'

function PitchLines() {
  return (
    <group position={[0, 0.03, 0]}>
      {/* Outer boundary */}
      <mesh>
        <boxGeometry args={[68, 0.02, 105]} />
        <meshBasicMaterial color="white" wireframe />
      </mesh>

      {/* Halfway line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[68, 0.02, 0.15]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Centre circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[9.05, 9.2, 64]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Penalty areas */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 39]}>
          <mesh>
            <boxGeometry args={[40.3, 0.02, 16.5]} />
            <meshBasicMaterial color="white" wireframe />
          </mesh>
          <mesh position={[0, 0, side * 8.25]}>
            <boxGeometry args={[18.3, 0.02, 5.5]} />
            <meshBasicMaterial color="white" wireframe />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function PlayerMarker({ position, number, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 1.3, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#e8c4a0" />
      </mesh>

      <Text
        position={[0, 2.2, 0]}
        fontSize={0.65}
        color="white"
        anchorX="center"
      >
        {number}
      </Text>
    </group>
  )
}

function Pitch() {
  const players = [
    [-20, 0, -35], [-7, 0, -35], [7, 0, -35], [20, 0, -35],
    [-22, 0, -12], [-7, 0, -12], [7, 0, -12], [22, 0, -12],
    [-12, 0, 12], [12, 0, 12],
    [0, 0, 35],
  ]

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[75, 112]} />
        <meshStandardMaterial color="#247b43" />
      </mesh>

      <PitchLines />

      {players.map((position, index) => (
        <PlayerMarker
          key={index}
          position={position}
          number={index + 1}
          color="#f4f4f4"
        />
      ))}
    </>
  )
}

export default function FootballPitch() {
  return (
    <div style={{ width: '100%', height: '650px', background: '#101010' }}>
      <Canvas camera={{ position: [0, 65, 85], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[20, 30, 20]} intensity={2} />
        <Pitch />
        <OrbitControls
          enablePan
          enableZoom
          minDistance={25}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  )
}
