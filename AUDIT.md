# Auditoría Completa de Cartas (Fase 1: Mitos y Leyendas - Primer Bloque)

Este documento contiene la auditoría completa de las 236 cartas canónicas del set en relación a la cobertura actual del motor .

## Resumen de Cobertura

- **Total de Cartas Auditoría:** 236
- **Cubiertas:** 138
- **Parcialmente Cubiertas:** 49
- **No Cubiertas:** 49

## Detalle por Carta

| # | Nombre | Tipo | Raza | Texto de Habilidad | Estado de Cobertura | Notas de Auditoría |
|---|--------|------|------|---------------------|---------------------|--------------------|
| 1 | REY ARTURO PENDRAGON | Aliado | Caballero | Solo puedes tener en juego a un Rey Arturo Pendragón. Mientras esté en juego, tus Caballeros ganan + 1 a la fuerza y tu oponente bota 2 cartas en cada fase de agrupación. En respuesta a que sea destruido, puedes descartar 2 para salvarlo. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 2 | REINA GUINIVERE | Aliado | Caballero | Cuando Reina Guinivere entra en juego, puedes buscar un Caballero en tu mazo castillo y ponerlo en tu mano. En tu fase de vigilia, genera 2 para bajar armas o 1 para bajar Caballeros. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 3 | SIR LANCELOT | Aliado | Caballero | Sir Lancelot no puede ser afectado por Talismanes. No tiene límite de armas. Por cada arma que porte, gana + 2 a la fuerza. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 4 | SIR GAWEIN | Aliado | Caballero | En guerra de Talismanes, destierra a Sir Gawein para que no se puedan jugar Talismanes hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 5 | SIR PERSIVAL | Aliado | Caballero | Cuando Sir Pérsival entra en juego, baraja un Aliado oponente. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 6 | SIR TRISTAN | Aliado | Caballero | Cuando Sir Tristán entra en juego, busca una carta en tu cementerio y pónla en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 7 | SIR GALAHAD | Aliado | Caballero | Sir Galahad puede atacar cuando entra en juego. Si hace daño al mazo castillo oponente, descártale 1 al azar. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 8 | PRINCIPE VALIANT | Aliado | Caballero | En guerra de Talismanes, puedes destruir Príncipe Valiant para que tus Caballeros sean imbloqueables hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 9 | LADY DAWN | Aliado | Caballero | En respuesta a que uno de tus Caballeros sea destruido, puedes pagar 3 de oro o destruir a Lady Dawn para salvarlo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 10 | EL OBISPO DE LONDINIUM | Aliado | Caballero | Cuando El Obispo De Londinium entra en juego, tu oponente bota 3 cartas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 11 | SIR BOORES | Aliado | Caballero | Tus Caballeros ganan + 2 a la fuerza, mientras Sir Boores esté en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 12 | CORNELIUS DE YORK | Aliado | Caballero | En guerra de Talismanes, puedes desterrar a Cornelius de York para destruir un Caballero oponente de igual o menor fuerza. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 13 | JOSOFONES | Aliado | Caballero | Cuando Josofones entra en juego, puedes buscar en tu mazo castillo a Sir Boores y ponerlo en tu mano. Al final del turno, no puedes robar. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 14 | SIR BEDIVERE | Aliado | Caballero | Mientras Sir Bedivere esté en juego, en tu fase de vigilia y una vez por turno, puedes nombrar un Aliado, si tu oponente lo tiene en su mano, lo bajas a tu línea de defensa sin pagar su coste. Se considera uno de tus Aliados hasta el final del juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 15 | EL GRAN WYRM | Aliado | Dragón | Sólo puedes tener en juego a un El Gran Wyrm. Mientras esté en juego, tus demás Dragones ganan + 1 a la fuerza y pueden atacar cuando entran en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 16 | DRAGON DE MAGMA | Aliado | Dragón | Cuando Dragón de Magma entra en juego, destruye un Aliado oponente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 17 | DRAGON DE ETER | Aliado | Dragón | Cuando Dragón de Eter es declarado atacante, todos los Aliados oponentes ganan - 1 a la fuerza hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 18 | DRAGON DEMONIO | Aliado | Dragón | Dragón Demonio debe atacar cuando entra en juego. No puede ser afectado por Talismanes. Al final de este turno, destiérralo. Carta única. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 19 | DRAGON DE LUZ | Aliado | Dragón | Si Dragón de Luz no es declarado atacante, puedes tomar las 3 cartas superiores de tu cementerio y barajarlas con tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 20 | DRAGON DE AIRE | Aliado | Dragón | Dragón del Aire puede atacar cuando entra en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 21 | DRAGON DEL AGUA | Aliado | Dragón | Cuando Dragón del Agua entra en juego, los Dragones no pueden ser afectados por Talismanes hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 22 | DRAGON DE PLATA | Aliado | Dragón | Mientras Dragón de Plata esté en juego: en tu fase de vigilia, puedes elegir entre pagar 1 de oro para robar 1 carta; pagar 2 de oro para descartar 1 de tu oponente al azar; o pagar 3 de oro para que tu oponente bote 2 cartas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 23 | DRAGON COBRIZO | Aliado | Dragón | En tu fase de vigilia, genera 2 oros para bajar Dragones. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 24 | DRAGON DE BRONCE | Aliado | Dragón | Cuando Dragón de Bronce sea declarado atacante, debe ser bloqueado por un Aliado oponente a tu elección. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 25 | KERNUAC EL CAZADOR | Aliado | Dragón | En tu fase de vigilia, puedes destruir a Kernuac, El Cazador, para buscar 2 cartas del mazo castillo oponente y desterrarlas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 26 | DRAGON NUBE | Aliado | Dragón | Cuando Dragón Nube entra en juego, puedes elegir entre robar 2 cartas o que tu oponente bote 2. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 27 | BASOON | Aliado | Dragón | Mientras Basoon esté en juego, cada vez que bajes un Dragón, tu oponente bota 1 carta. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 28 | OBERON | Aliado | Faerie | Solo puedes tener un Oberon en juego. En tu fase de vigilia y una vez por turno, puedes pagar el coste de un Aliado oponente y destruirlo. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 29 | TITANIA | Aliado | Faerie | Mientras Titania esté en juego, tus demás Faeries ganan + 1 a la fuerza y pueden atacar cuando entran en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 30 | MAGO MERLIN | Aliado | Faerie | Mientras Mago Merlín esté en juego: en guerra de Talismanes, puedes pagar 3 de oro para buscar un Talismán en tu mazo castillo o cementerio y ponerlo en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 31 | MORDRED | Aliado | Faerie | Si Mordred es declarado atacante, debe ser bloqueado por un Aliado oponente a tu elección. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 32 | MORGANA | Aliado | Faerie | Solo puedes tener una Morgana en juego. En tu fase de vigilia y una vez por turno, puedes destruir uno de tus aliados para desterrar un aliado oponente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 33 | BELIAL EL BESTIAL | Aliado | Faerie | Belial, El Bestial, gana + 1 a la fuerza por cada faerie que tengas en juego. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 34 | LA DAMA DEL LAGO | Aliado | Faerie | Cuando La Dama del Lago entra en juego, puedes buscar un arma en tu mazo castillo o cementerio y ponerla en juego sin pagar su coste. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 35 | ALTO DRUIDA | Aliado | Faerie | Alto Druida sólo puede bloquear. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 36 | LAS TRES HERMANAS | Aliado | Faerie | En guerra de Talismanes y una vez por turno, puedes pagar 2 de oro para que un aliado en juego vuelva a la mano. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 37 | EL POETA | Aliado | Faerie | Cuando entra en juego, nombra una carta y ésta no puede ser bajada mientras El Poeta esté en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 38 | PUCK | Aliado | Faerie | En guerra de Talismanes y una vez por turno, puedes pagar 1 de oro para que un Aliado oponente no pueda bloquear o atacar durante este turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 39 | EACH USIGE | Aliado | Faerie | En tu fase de vigilia y una vez por turno, puedes pagar el coste de una carta en tu cementerio para barajarla en tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 40 | ELLYLLON | Aliado | Faerie | Cada vez que Ellyllon entre o salga del juego, tu oponente bota 2 cartas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 41 | PLAGA | Talismán | Sin Raza | Destruye dos Aliados oponentes. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 42 | LA TRAICION DE LANCELOT | Talismán | Sin Raza | Destruye uno de tus Aliados para que tu oponente bote tantas cartas como fuerza tenga el Aliado. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 43 | DESLEAL | Talismán | Sin Raza | Destierra un Aliado oponente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 44 | BOLA DE FUEGO | Talismán | Sin Raza | Destruye una carta en juego, que no sea un oro. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 45 | TRANSMUTACION | Talismán | Sin Raza | En tu fase de vigilia y hasta el final del turno, tus Tótem pierden su habilidad y se consideran Aliados. En tu fase de ataque pueden ser declarados atacantes, con fuerza igual a su coste. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 46 | FE SIN LIMITE | Talismán | Sin Raza | Fe sin Límites puede ser jugada, en cualquier momento, para anular un Talismán. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 47 | DRAGON DORADO | Talismán | Sin Raza | Dragón Dorado puede ser jugado en cualquier momento para anular una carta. Carta Unica. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 48 | CUNA DE DRAGONES | Talismán | Sin Raza | Busca 2 cartas en tu cementerio y barájalas con tu mazo castillo. Puedes robar 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 49 | LA MIRADA DE MORDRED | Talismán | Sin Raza | En respuesta a declarar tu bloqueo, tus Aliados en línea de ataque vuelven a la línea de defensa y pueden ser declarados bloqueadores. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 50 | SANTO GRIAL | Talismán | Sin Raza | En respuesta a que una de tus cartas en juego sea destruida, juega a Santo Grial para subirla a la mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 51 | UNA | Talismán | Sin Raza | Juega a Una en guerra de Talismanes. Los jugadores descartan de su mano y roban la misma cantidad que tenían. Los 2 siguientes turnos no pueden declarar ataque. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 52 | CAPA DE INVISIBILIDAD | Talismán | Sin Raza | En respuesta a que tu oponente baje una carta, ésta es barajada en su mazo castillo. Esta habilidad no afecta a los oros. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 53 | ATAQUE SORPRESA | Talismán | Sin Raza | En respuesta a resolver el daño, juega Ataque Sorpresa para que tu oponente reciba el mismo daño hecho a tu mazo castillo por uno de sus Aliados. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 54 | AULLADORES BLANCOS | Talismán | Sin Raza | En respuesta a que una de tus cartas sea destruida, destruye una carta oponente del mismo tipo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 55 | ATAQUE DE ALIENTO | Talismán | Sin Raza | En respuesta a resolver el daño, juega Ataque de Aliento para que tu oponente reciba el mismo daño hecho a tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 56 | LA ESPADA EN LA PIEDRA | Talismán | Sin Raza | Si el Rey Arturo Pedragón no esta en juego, los Caballeros no pueden atacar en los 2 siguientes turnos. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 57 | ATRAER LA TORMENTA | Talismán | Sin Raza | Anula una carta oponente, a menos que éste bote 3 cartas. Atraer la Tormenta no afecta a los oros. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 58 | BARCO | Talismán | Sin Raza | Juega Barco en tu fase de vigilia, si tienes a Merlín en juego tus faeries son imbloqueables hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 59 | CABALLO LUNAR | Talismán | Sin Raza | Mira la mano de tu oponente y descarta todos los aliados que tenga. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 60 | STONEHAGE | Tótem | Sin Raza | Mientras Stonehage esté en juego, los oros en juego pierden sus habilidades. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 61 | TOTEM MALDITO | Tótem | Sin Raza | En respuesta a un ataque oponente y sólo una vez por turno, puedes elegir un Aliado en su línea de defensa para bloquear su ataque. Si no es destruido, al final del turno devuélvelo a la línea de defensa del oponente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 62 | TOTEM DE FE | Tótem | Sin Raza | Mientras Tótem de Fe esté en juego, en guerra de Talismanes, cada jugador sólo puede jugar un Talismán. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 63 | TOTEM DE RUNAS ELFICAS | Tótem | Sin Raza | En respuesta a declarar tu ataque y sólo una vez por turno, puedes elegir un Aliado oponente y ponerlo en tu línea de ataque. Si no es destruido, al final del turno devuélvelo a la línea de defensa del oponente. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 64 | TOTEM DE LA ULTIMA CANCION | Tótem | Sin Raza | En tu fase de vigilia y una vez por turno, puedes pagar 2 de oro para buscar un Tótem en tu mazo castillo y ponerlo en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 65 | WOODHAGE | Tótem | Sin Raza | Mientras Woodhage esté en juego, bajar Tótem cuesta + 1 oro. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 66 | EL CIRCULO ETERNO | Tótem | Sin Raza | Mientras esté en juego, todas las cartas se consideran Carta Única. Cuando El Círculo Eterno entra en juego y si algún jugador tiene 2 o más copias de una carta, debe dejar sólo una en juego y las demás destruirlas. Este Tótem no afecta cartas oro. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 67 | EXCALIBUR | Arma | Sin Raza | Sólo puede ser portada por Rey Arturo Pendragón. Gana + 3 a la fuerza. En tu fase de vigilia y una vez por turno, puedes descartar 1 para que gane un bono de fuerza igual al coste en oro de la carta descartada. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 68 | ESPADA DE CRISTAL | Arma | Sin Raza | Su portador sólo puede ser un Faerie. Si tu oponente juega un Talismán, en respuesta puedes destruir Espada de Cristal para anularlo. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 69 | ESCUDO SIDHE | Arma | Sin Raza | Cuando el portador de Escudo Sidhe bloquea, no puede ser destruido hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 70 | MALLA DE MITRIL | Arma | Sin Raza | Sólo puede ser portada por un Dragón. Gana + 2 a la fuerza y no puede ser destruido por Talismanes. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 71 | LA LANZA DE LOS DIOSES | Arma | Sin Raza | Su portador gana + 4 a la fuerza. En respuesta a finalizar tu turno y si el portador no fue destruido en batalla mitológica, agrúpalo a línea de defensa y destierra La Lanza de Los Dioses. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 72 | ARMADURA DEL SOL | Arma | Sin Raza | Por cada Talismán jugado en guerra de Talismanes, el portador de La Armadura del Sol gana + 1 a la fuerza hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 73 | ESPADA DRAGON | Arma | Sin Raza | Su portador debe ser un Dragón. Gana + 2 a la fuerza. En tu fase de vigilia, destierra Espada Dragón para anular la habilidad de una carta en juego hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 74 | LLEWELYN VOZ DE PLATA | Aliado | Caballero | Cuando Llewelyn voz de plata entra en juego, elige un Aliado oponente y súbelo a su mano. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 75 | SIR OWEN | Aliado | Caballero | Cuando Sir Owen entra en juego, roba 3 cartas y descarta 2. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 76 | LADY RACHEL | Aliado | Caballero | Puedes desterrar a Lady Rachel para destruir un Dragón oponente. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 77 | SIR GABRIEL | Aliado | Caballero | Sir Gabriel gana + 1 a la fuerza, por cada carta que tengas en tu zona de destierro. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 78 | ISOLDA | Aliado | Caballero | En respuesta a la destrucción de uno de tus Caballeros, puedes desterrar a Isolda para salvarlo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 79 | LORD FERGUS MACLOUD | Aliado | Caballero | Sólo puede atacar si descartas 3. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 80 | SIR WESLEY | Aliado | Caballero | Sir Wesley no puede portar armas. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 81 | SIR BADALLOR | Aliado | Caballero | Si porta un arma, puede bloquear 2 Aliados. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 82 | LOTH | Aliado | Caballero | Si Loth es tu único Aliado declarado atacante, no se pueden jugar Talismanes hasta el final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 83 | SIR BALDWIN | Aliado | Caballero | Si es destruido, puedes ver las 3 cartas superiores de tu mazo castillo y devolverlas en el orden que quieras. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 84 | SIR LIONEL | Aliado | Caballero | En respuesta a finalizar tu turno, si Sir Lionel está en línea de ataque puedes agruparlo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 85 | SIR HECTOR | Aliado | Caballero | Cuando Sir Héctor entra en juego, tu oponente descarta 1. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 86 | SIR SAGREGOR | Aliado | Caballero | Sir Sagregor no puede portar armas. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 87 | DRAGON MONTAA | Aliado | Dragón | Si Dragón Montaña ataca, debe ser destruido al final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 88 | TORTUGA DRAGON | Aliado | Dragón | Tortuga Dragón puede atacar cuando entra en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 89 | DRAGON ESPIA | Aliado | Dragón | Si Dragón Espía hace daño al mazo castillo oponente, puedes ver su mano. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 90 | DARG EL SEMI DRAGON | Aliado | Dragón | En tu fase de vigilia y hasta 3 veces por turno, puedes pagar 1 de oro para que Darg, El Semi Dragón, gane + 1 a la fuerza hasta el final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 91 | ORG EL HECHICERO | Aliado | Dragón | En guerra de Talismanes, puedes pagar 2 de oro para que un Aliado oponente tenga fuerza 0 hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 92 | DRAGON NEGRO | Aliado | Dragón | Todos los Caballeros ganan - 1 a la fuerza, mientras Dragón Negro esté en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 93 | DRAGON NIVAL | Aliado | Dragón | Cuando Dragón Nival entra en juego, deben ser destruidos todos los Aliados de fuerza 2 o menos. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 94 | DRAGON DE MERCURIO | Aliado | Dragón | En guerra de Talismanes, gana + 1 a la fuerza por cada Dragón que esté en tu cementerio. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 95 | MONTA DRAGONES | Aliado | Dragón | Si es destruido, tu oponente debe botar tantas cartas como fuerza tenga Monta Dragones. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 96 | WYVERN | Aliado | Dragón | La carta que destruya a Wyvern debe ser desterrada. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 97 | DRACO ESMERALDA | Aliado | Dragón | Cuando Draco Esmeralda entra en juego, puedes buscar un Faerie en tu mazo castillo y ponerlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 98 | DRACO CONJURADOR | Aliado | Dragón | Cuando Draco Conjurador entra en juego, puedes buscar un oro normal en tu mazo castillo y ponerlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 99 | SERPENTINO | Aliado | Dragón | En guerra de Talismanes, puedes pagar 1 oro para que un Aliado oponente gane - 1 a la fuerza hasta el final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 100 | MULVAN EL DRAGON | Aliado | Dragón | En guerra de Talismanes, Mulvan, El Dragón puede duplicar su fuerza. Al final de este turno, destiérralo. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 101 | LORD ELFO | Aliado | Faerie | Gana + 1 a la fuerza, por cada Faerie que tengas en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 102 | LADY SHEE DIA | Aliado | Faerie | Cuando Lady Shee Dia entra en juego, puedes buscar a Sir Galahad en tu mazo castillo y ponerlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 103 | GREENKNIGHT | Aliado | Faerie | Gana + 1 a la fuerza, por cada oro que tengas en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 104 | BRUJA ANIS | Aliado | Faerie | En respuesta a finalizar tu turno, y si todos tus aliados son Faeries, roba 1 carta extra. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 105 | BANSHEE | Aliado | Faerie | Cuando entra en juego, puedes elegir un Aliado oponente para que no pueda atacar mientras Banshee esté en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 106 | POOKA | Aliado | Faerie | Cuando Pooka entra en juego, puedes buscar hasta 3 Faeries en tu cementerio y barajarlos en tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 107 | ELFO OSCURO | Aliado | Faerie | Cuando Elfo Oscuro entra en juego, roba 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 108 | NIXX | Aliado | Faerie | Cuando Nixx porta un arma, gana + 2 a la fuerza. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 109 | LOBOS DE AVALON | Aliado | Faerie | Cuando Lobos de Avalon entra en juego, puedes buscar otro Lobos de Avalon en tu mazo castillo y ponerlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 110 | PIXIE | Aliado | Faerie | En tu fase de vigilia y sólo si tienes a Morgana en juego, puedes elegir entre robar 3 cartas o buscar 2 en tu cementerio y barajarlas en tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 111 | KELPIE | Aliado | Faerie | Cuando Kelpie entra en juego, uno de tus Dragones gana + 2 a la fuerza permanente y durante este turno se considera imbloqueable. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 112 | BANE | Aliado | Faerie | Cuando Bane entra en juego puedes elegir, de tu oponente, un oro con habilidad para que lo baraje en su mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 113 | ETTIN | Aliado | Faerie | En respuesta a que Ettin sea declarado atacante, puedes buscar un Aliado de fuerza 2 en tu mazo castillo y ponerlo en la línea de defensa sin pagar su coste. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 114 | SAN JORGE Y EL DRAGON | Talismán | Sin Raza | Por cada Dragón de tu oponente, un Aliado gana + 1 de fuerza hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 115 | CUATRO FUERTES VIENTOS | Talismán | Sin Raza | En respuesta a un ataque, es destruido el Aliado oponente de mayor fuerza. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 116 | MISIL MAGICO | Talismán | Sin Raza | En guerra de Talismanes, elige entre robar 2 cartas o que un Aliado gane + 2 a la fuerza hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 117 | FLECHA CIDA | Talismán | Sin Raza | Destruye un Aliado oponente de fuerza 2 o menor. Luego roba 1 carta. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 118 | CONGELAR | Talismán | Sin Raza | En respuesta a un ataque, un Aliado oponente pierde su habilidad hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 119 | NOMBRADO CABALLERO | Talismán | Sin Raza | Tus Aliados son Caballeros hasta el final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 120 | ESTAMPIDA | Talismán | Sin Raza | En respuesta a finalizar tu turno, juega Estampida. Un Aliado oponente a elección debe atacar en el próximo turno. Si este no ataca es destruido. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 121 | CUNA DE GUSANOS | Talismán | Sin Raza | En respuesta a que uno de tus aliados sea destruido, baraja de tu cementerio a tu mazo castillo tantas cartas como fuerza tenga ese aliado. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 122 | PERGAMINO MAGICO | Talismán | Sin Raza | Busca un Talismán en tu mazo castillo y ponlo en tu mano. Tu oponente puede botar 3 cartas para anular Pergamino Mágico. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 123 | LA PIEDRA DE LOS SUEOS | Talismán | Sin Raza | Busca dos armas en tu mazo castillo y ponlas en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 124 | JUSTA | Talismán | Sin Raza | Destruye uno de tus Aliados y un oponente de igual fuerza. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 125 | EL JUICIO DE DIOS | Talismán | Sin Raza | Cada jugador destruye, a su elección, 2 cartas que tenga en juego. El Juicio de Dios no afecta oros. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 126 | INCINERAR | Talismán | Sin Raza | Destruye 2 de tus Aliados y una carta oponente. Incinerar no afecta oros. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 127 | FAVOR DE LA CORTE | Talismán | Sin Raza | Elige una carta oponente y devuélvela a su mano. Favor de la Corte no afecta oros. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 128 | KNOCKERS | Talismán | Sin Raza | Un Aliado que porte un arma, gana + 2 a la fuerza hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 129 | BROWNIE | Talismán | Sin Raza | Descarta 2 de tu oponente al azar. Tu oponente roba 1 carta. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 130 | URISK | Talismán | Sin Raza | Cada jugador roba 2 cartas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 131 | LEGADO DEL BOSQUE | Talismán | Sin Raza | Cada jugador baraja 2 cartas de su cementerio con su mazo castillo y luego roba 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 132 | PRODUCIR TERREMOTO | Talismán | Sin Raza | Cada jugador bota 3 cartas. Producir Terremoto no puede ser anulado. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 133 | TOTEM DEL ERRANTE | Tótem | Sin Raza | En tu fase de vigilia, puedes pagar 2 de oro para desterrar la carta superior del mazo castillo oponente. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 134 | TOTEM GOBLIN | Tótem | Sin Raza | En tu fase de vigilia y una vez por turno, puedes pagar 3 de oro para que tu oponente bote 3 cartas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 135 | TOTEM DE CRISTAL | Tótem | Sin Raza | En tu fase de vigilia y una vez por turno, puedes pagar 3 de oro para barajar un Talismán de tu cementerio a tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 136 | TOTEM ALQUIMICO | Tótem | Sin Raza | En tu fase de vigilia y sólo una vez por turno, puedes destruir a uno de tus Aliados para generar tanto oro como fuerza tenga ese Aliado. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 137 | OLDHAGE | Tótem | Sin Raza | En tu fase de vigilia, puedes pagar 2 de oro y botar 1 carta para buscar un Tótem en tu mazo castillo y ponerlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 138 | TOTEM DE NWYRE | Tótem | Sin Raza | Paga 1 de oro y roba 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 139 | TOTEM DEL CONJURADOR | Tótem | Sin Raza | Sólo puedes tener un Tótem del Conjurador en tu línea de apoyo. Cada vez que bajes un Aliado, tu oponente bota de su mazo castillo tantas cartas como fuerza tenga el Aliado. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 140 | ARMADURA COMPLETA | Arma | Sin Raza | El portador de Armadura Completa no puede ser afectado por habilidades de Aliados oponentes. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 141 | HACHA DE BATALLA | Arma | Sin Raza | El portador de Hacha de Batalla gana + 2 a la fuerza y puede robar 1 carta extra al final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 142 | BOTAS ELFICAS | Arma | Sin Raza | El portador de Botas Elficas puede ser declarado como atacante. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 143 | ESPADA DENTADA | Arma | Sin Raza | Si su portador es un Dragón, gana + 2 a la fuerza. Si su portador no es un Dragón, gana + 1 a la fuerza. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 144 | MANDOBLE | Arma | Sin Raza | El portador de Mandoble duplica su fuerza y para atacar debe pagar 2 de oro. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 145 | SCOTISH | Arma | Sin Raza | Si su portador es un Faerie, gana + 2 a la fuerza. Si su portador no es un Faerie, gana + 1 a la fuerza. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 146 | MORNING STAR | Arma | Sin Raza | El portador de Morning Star gana + 2 a la fuerza y se considera imbloqueable. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 147 | KAY | Aliado | Caballero | Sólo puede atacar si Rey Arturo Pendragón está en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 148 | HALCONERO REAL | Aliado | Caballero | Cuando entra en juego roba 1 carta, a menos que tu oponente descarte 1. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 149 | PIQUEROS | Aliado | Caballero | En tu fase de vigilia, si Piqueros está en tu cementerio, puedes pagar su coste y ponerlo en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 150 | CABALLERIA LIGERA | Aliado | Caballero | Caballería Ligera puede bloquear a dos Aliados atacantes. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 151 | COMISARIO | Aliado | Caballero | En tu fase de vigilia, destierra a Comisario para que tu oponente no pueda robar en su turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 152 | GUARDIA REAL | Aliado | Caballero | Guardia Real debe atacar al entrar en juego en todos tus turnos. Si algún turno no ataca, debe ser destruido. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 153 | CAMPESINO | Aliado | Caballero | En tu fase de vigilia, destruye a Campesino para generar 1 oro por este turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 154 | SIR GARETH | Aliado | Caballero | Sir Gareth puede portar dos armas. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 155 | SIR THOMAS | Aliado | Caballero | Cuando Sir Thomas es declarado atacante, gana + 2 a la fuerza hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 156 | SIR LUCAN | Aliado | Caballero | Cuando entra en juego, puedes buscar otro Sir Lucan en tu mazo castillo y ponerlo en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 157 | SIR MADOR DEL PORTAL | Aliado | Caballero | Sólo puede bloquear. No puede portar armas. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 158 | SIR GAERIN EL BLANCO | Aliado | Caballero | En tu fase de vigilia puedes destruir a Sir Gaerin, El Blanco, para anular la habilidad de un Caballero hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 159 | SIR JASON DE LA SANGRE | Aliado | Caballero | Si tienes algún Dragón en juego, Sir Jason de la Sangre puede atacar cuando entra en juego. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 160 | DUQUE THURK BLOODLINE | Aliado | Dragón | Sólo puede atacar, si designas como atacantes a otros 2 Dragones. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 161 | AGHAST EL DRAGON | Aliado | Dragón | Cuando Aghast, El Dragón, entra en juego, puedes buscar un arma en tu mazo castillo y ponerla en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 162 | DRACO SANGRE | Aliado | Dragón | Puede atacar cuando entra en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 163 | ATHA-UK | Aliado | Dragón | En tu fase de vigilia, puedes destruir a Atha-Uk para desterrar 1 carta del cementerio oponente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 164 | GUERREROS DEL DRAGON | Aliado | Dragón | Si es destruida, Guerreros del Dragón, debes desterrarla. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 165 | BARBAROS ENFURECIDOS | Aliado | Dragón | Si no tienes otro Aliado Dragón en juego, destruye a los Bárbaros Enfurecidos al final de este turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 166 | DRAGON NODRIZA | Aliado | Dragón | Cuando entra en juego, puedes buscar otra copia de Dragón Nodriza en tu mazo castillo y ponerla en tu mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 167 | DRAGONEL | Aliado | Dragón | Sólo puede bloquear. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 168 | BANDIDOS PICTOS | Aliado | Dragón | Puedes destruir Bandidos Pictos, para barajar a un Aliado oponente de igual fuerza en su mazo castillo. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 169 | DRACO GUILA | Aliado | Dragón | Draco Águila se considera imbloqueable. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 170 | CULTISTAS DEL DRAGON | Aliado | Dragón | Puedes destruir a Cultista del Dragón, para ver la mano de tu oponente y barajar en su mazo castillo una carta de Aliado de su mano. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 171 | CABALLEROS PICTOS | Aliado | Dragón | Sólo puede atacar, si tu oponente tiene algún Caballero en juego. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 172 | DREGON | Aliado | Dragón | Si Dregon es declarado atacante, debes destruirlo al final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 173 | RAVIDO | Aliado | Dragón | Cuando Rávido entra en juego, debe ser declarado atacante y destruirlo al final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 174 | GOBLIN | Aliado | Faerie | Si tienes 3 Goblin en juego, éstos se consideran imbloqueables. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 175 | HOBGLOBIN | Aliado | Faerie | Mientras tengas a Hobglobin en juego, al final de tu turno, debes descartar 1 carta. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 176 | ARQUERO ELFO | Aliado | Faerie | Si Arquero Elfo es declarado bloqueador, destrúyelo al final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 177 | CIERVO SAGRADO | Aliado | Faerie | Cuando Ciervo Sagrado ataque, tus Aliados imbloqueables ganan + 1 a la fuerza hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 178 | DUENDES | Aliado | Faerie | Cuando Duendes entre en juego, debes descartar 1 carta. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 179 | GOBLIN CONJURADOR | Aliado | Faerie | En tu fase de vigilia y una vez por turno, puedes pagar 3 de oro para buscar un Talismán en tu mazo castillo y ponerlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 180 | ARMADA ELFICA | Aliado | Faerie | Gana + 1 a la fuerza, por cada Armada Élfica que tengas en juego. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 181 | TALSOI | Aliado | Faerie | Si Talsoi porta un arma, gana + 1 a la fuerza y debe atacar todos tus turnos. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 182 | HIJAS DEL CALDERO | Aliado | Faerie | Si tienes 3 Hijas del Caldero en juego: en respuesta a finalizar tu turno, puedes desterrarlas para ganar un turno extra. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 183 | GALEB DUHR | Aliado | Faerie | En respuesta a que uno de tus oros sea destruido, puedes barajar a Galeb Duhr en tu mazo castillo para salvarlo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 184 | OTYUGH | Aliado | Faerie | Por cada Aliado que tengas en juego, Otyugh gana + 1 a la fuerza. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 185 | BOGGART | Aliado | Faerie | Si Boggart es destruido, tu oponente elige entre botar 2 cartas de su mazo castillo o descartar 1 de su mano. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 186 | BRAG | Aliado | Faerie | Cuando Brag entra en juego, puedes barajar 1 carta de tu mano en tu mazo castillo. Luego robar 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 187 | ASESINOS EN LA CORTE | Talismán | Sin Raza | Destruye un Aliado oponente de fuerza 2 ó menor. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 188 | CAMINO A VALON | Talismán | Sin Raza | Destruye 1 de tus Aliados para barajar 1 carta de tu cementerio en tu mazo castillo. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 189 | CANTRIP | Talismán | Sin Raza | Roba 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 190 | NOMBRADO ESCUDERO | Talismán | Sin Raza | En tu fase de vigilia, elige un Aliado oponente y éste no podrá bloquear Caballeros hasta el final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 191 | GRIG | Talismán | Sin Raza | En guerra de Talismanes, uno de tus Aliados gana + 2 a la fuerza hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 192 | TALISMAN CELTA | Talismán | Sin Raza | Tu oponente debe destruir un Aliado a su elección. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 193 | JUGLARES | Talismán | Sin Raza | Genera un oro hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 194 | HECHIZO DE NIEBLA | Talismán | Sin Raza | Un Aliado oponente no puede bloquear durante este turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 195 | YERMO | Talismán | Sin Raza | Sube a la mano un Aliado oponente que porte un arma. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 196 | FUNERAL PARA UN AMIGO | Talismán | Sin Raza | Baraja del cementerio a tu mazo castillo un Aliado. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 197 | DIOSES EN LA SOMBRA | Talismán | Sin Raza | Un Aliado oponente gana - 2 a la fuerza hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 198 | EL JUEZ | Talismán | Sin Raza | En tu fase de vigilia, elige un Aliado oponente para que pierda su habilidad hasta el final del turno. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 199 | ATAQUE DRAGON | Talismán | Sin Raza | Un Dragón gana + 2 a la fuerza hasta el final turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 200 | RELATOS EN LA MESA REDONDA | Talismán | Sin Raza | En tu fase de vigilia, muestra la mano a tu oponente. Si no tienes ningún Talismán, busca uno de tu mazo castillo y pónlo en tu mano. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 201 | LEPRECHAUN | Talismán | Sin Raza | En respuesta a un ataque, juega a Leprechaun para que los Aliados oponentes ganen - 1 a la fuerza hasta el final del turno. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 202 | BUGBEAR | Talismán | Sin Raza | En tu fase de vigilia: descarta 1 carta de la mano de tu oponente al azar, para que bote de su mazo castillo tantas cartas como coste de oro tenga la carta descartada. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 203 | SER INCORPOREO | Talismán | Sin Raza | Un Aliado puede bloquear Aliados imbloqueables, hasta el final del juego. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 204 | GWYLLION | Talismán | Sin Raza | Por dos turnos, los oponentes juegan mostrando su mano. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 205 | VEGETACION ANIMADA | Talismán | Sin Raza | En tu fase de vigilia, destruye uno de tus oros para que un Aliado oponente tenga fuerza cero hasta el final del turno. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 206 | ALQUIMISTA | Talismán | Sin Raza | En tu fase de vigilia, busca un oro normal en tu mazo castillo y pónlo en tu reserva. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 207 | TOTEM CELTA | Tótem | Sin Raza | Cuando el Tótem Celta entre en juego, nombra un tipo de carta. Mientras esté en juego, siempre que tu oponente juegue ese tipo, debe botar 2 cartas. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 208 | TOTEM DE BOSSUS | Tótem | Sin Raza | En cada fase de agrupar, tu oponente destierra 1 carta de su cementerio. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 209 | TOTEM DE HOBGOBLIN | Tótem | Sin Raza | En tu fase de vigilia, puedes elegir: Pagar 4 de oro, para que tu oponente bote 4 cartas; o destruir a Tótem Hobgoblin, para robar 2 cartas. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 210 | TOTEM DE LAS ALAS ETERNAS | Tótem | Sin Raza | Mientras Tótem de las Alas Eternas esté en juego, tus Aliados imbloqueables ganan + 1 a la fuerza. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 211 | TOTEM DEL DRACO | Tótem | Sin Raza | Cada vez que bajes un Dragón, puedes buscar una carta de tu cementerio y barajarla con tu mazo castillo. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 212 | ARGUSTHAT | Tótem | Sin Raza | En tu fase de vigilia y una vez por turno, puedes pagar 2 de oro para buscar un Aliado en tu cementerio y barajarlo con tu mazo castillo. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 213 | TOTEM DEL ALBA | Tótem | Sin Raza | Mientras Tótem del Alba esté en juego, cada vez que bajes un Tótem, tu oponente debe botar 1 carta. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 214 | ESPADA LARGA | Arma | Sin Raza | Para que el portador de Espada Larga pueda atacar, debe pagar 2 de oro. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 215 | CABALLO DE BATALLA | Arma | Sin Raza | Su portador debe ser un Caballero. En cada turno que no sea declarado atacante, puedes ver las 4 cartas superiores de tu mazo castillo, ordenarlas y devolverlas como quieras. | No Cubierta | Sin reconocedor explícito ni genérico suficiente. |
| 216 | CABALLO LIGERO | Arma | Sin Raza | Su portador se considera imbloqueable. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 217 | DARDOS ENVENENADOS | Arma | Sin Raza | En tu fase de vigilia, su portador gana - 1 a la fuerza permanentemente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 218 | CATAPULTA | Arma | Sin Raza | Si su portador es bloqueado, tu oponente se descarta de 1 carta. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 219 | ESPADA CORTA | Arma | Sin Raza | Su portador gana + 1 a la fuerza y puede portar otra arma. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 220 | ALABARDA | Arma | Sin Raza | Destierra a Alabarda, para que su portador gane + 2 a la fuerza permanentemente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 221 | CODEX ARTURICUS | Oro | Sin Raza | En la fase de asignación de daño, destierra Codex Artúricos para reducir todo el daño a 0. No puede ser usado como oro inicial. Carta Única. | Parcialmente Cubierta | Depende del reconocedor genérico por palabras clave del motor. |
| 222 | AZOR | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 223 | PERGAMINO DE BARDO | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 224 | TIERRAS CULTIVADAS | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 225 | HERRERO | Oro | Sin Raza | En tu fase de vigilia, Herrero genera 2 oros para jugar armas. Si pierde la habilidad es destruido. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 226 | CARRUAJE DE PLATA | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 227 | ESCUDO DE FAMILIA | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 228 | TESORO CELTA | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 229 | VOTOS SAGRADOS | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 230 | RBOL DE LOS VIEJOS DIOSES | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 231 | ANILLO FAERIE | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 232 | JOYERIA PICTA | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 233 | COLLAR DE DRAGON | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 234 | FLOTA MERCANTE | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
| 235 | MESA REDONDA | Oro | Sin Raza | En respuesta a que Mesa Redonda sea destruido, destruye 1 oro oponente. | Cubierta | Manejador explícito por nombre en abilityEngine.ts. |
| 236 | EL MERCADO DE CAMELOT | Oro | Sin Raza | (Sin habilidad) | Cubierta | Carta sin habilidad especial (Vanilla/Oro). |
