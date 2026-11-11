
import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Billboard } from '@react-three/drei'
import { supabase } from '../supabase'

function PitchLines() {
  return (
    <group position={[0, 0.03, 0]}>
      <mesh>
        <boxGeometry args={[68, 0.02, 105]} />
        <meshBasicMaterial color="white" wireframe />
      </mesh>

      <mesh>
        <boxGeometry args={[68, 0.02, 0.15]} />
        <meshBasicMaterial color="white" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.05, 9.2, 128]} />
        <meshBasicMaterial color="white" />
      </mesh>

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

function PlayerMarker({ position, player, index }) {
  const number = player.shirt_number ?? index + 1

  return (
    <group position={position}>

      {/* Head */}
      <mesh position={[0, 2.85, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#bd8968" roughness={0.8} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.48, 0]}>
        <cylinderGeometry args={[0.12, 0.13, 0.25, 24]} />
        <meshStandardMaterial color="#bd8968" />
      </mesh>

      {/* Jersey */}
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.48, 0.38, 1.05, 32]} />
        <meshStandardMaterial color="#f4f4f4" roughness={0.65} />
      </mesh>

      {/* Shirt number on back */}
      <Text
        position={[0, 2.0, 0.405]}
        fontSize={0.55}
        color="#111111"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.015}
        outlineColor="white"
        depthOffset={-1}
      >
        {String(number)}
      </Text>

      {/* Player name above head */}
      <Billboard position={[0, 3.75, 0]}>
        <Text
          fontSize={0.65}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.035}
          outlineColor="#101010"
          maxWidth={8}
          textAlign="center"
        >
          {player.name}
        </Text>
      </Billboard>

      {/* Arms */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 0.55, 1.85, 0]}
            rotation={[0, 0, side * 0.18]}
          >
            <cylinderGeometry args={[0.12, 0.14, 0.85, 24]} />
            <meshStandardMaterial color="#f4f4f4" />
          </mesh>

          <mesh position={[side * 0.59, 1.38, 0]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color="#bd8968" />
          </mesh>
        </group>
      ))}

      {/* Shorts */}
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.38, 0.35, 0.42, 32]} />
        <meshStandardMaterial color="#171717" />
      </mesh>

      {/* Legs, socks and boots */}
      {[-0.19, 0.19].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.68, 0]}>
            <cylinderGeometry args={[0.14, 0.12, 0.65, 24]} />
            <meshStandardMaterial color="#bd8968" />
          </mesh>

          <mesh position={[x, 0.25, 0]}>
            <cylinderGeometry args={[0.13, 0.12, 0.28, 24]} />
            <meshStandardMaterial color="#f4f4f4" />
          </mesh>

          <mesh position={[x, 0.09, 0.12]}>
            <boxGeometry args={[0.22, 0.16, 0.38]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Pitch({ players }) {
  const positions = [
    [-20, 0, -35],
    [-7, 0, -35],
    [7, 0, -35],
    [20, 0, -35],
    [-22, 0, -12],
    [-7, 0, -12],
    [7, 0, -12],
    [22, 0, -12],
    [-12, 0, 12],
    [12, 0, 12],
    [0, 0, 35],
  ]

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[75, 112]} />
        <meshStandardMaterial color="#247b43" roughness={1} />
      </mesh>

      <PitchLines />

      {players.slice(0, 11).map((player, index) => (
        <PlayerMarker
          key={player.id}
          position={positions[index]}
          player={player}
          index={index}
        />
      ))}
    </>
  )
}

export default function FootballPitch() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, shirt_number, position, photo_url, is_active')
        .eq('is_active', true)
        .order('shirt_number', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setPlayers(data || [])
      }

      setLoading(false)
    }

    fetchPlayers()
  }, [])

  return (
    <div style={{
      width: '100%',
      height: '650px',
      background: '#101010',
      position: 'relative'
    }}>
      {loading && (
        <div style={{
          position: 'absolute',
          zIndex: 2,
          top: 15,
          left: 15,
          color: 'white',
          fontSize: 12
        }}>
          LOADING PLAYERS...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          zIndex: 2,
          top: 15,
          left: 15,
          color: '#ff7777',
          fontSize: 12
        }}>
          Could not load players: {error}
        </div>
      )}

      {!loading && !error && players.length === 0 && (
        <div style={{
          position: 'absolute',
          zIndex: 2,
          top: 15,
          left: 15,
          color: 'white',
          fontSize: 12
        }}>
          NO ACTIVE PLAYERS FOUND
        </div>
      )}

      <Canvas
        camera={{
          position: [0, 65, 85],
          fov: 45,
          near: 0.1,
          far: 300
        }}
        dpr={2}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[20, 30, 20]} intensity={2} />

        <Pitch players={players} />

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
