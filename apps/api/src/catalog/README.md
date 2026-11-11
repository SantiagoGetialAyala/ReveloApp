# Municipios de Colombia

`colombia.json` es una copia local del catálogo [DIVIPOLA - Códigos municipios de Datos Abiertos Colombia](https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w), descargada el 20 de octubre de 2026 desde `https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=2000`.

Incluye 32 departamentos y Bogotá D. C., con 1.122 registros territoriales, incluidas áreas no municipalizadas presentes en la fuente. Los nombres provienen de la fuente; solo se cambió la capitalización. Las coordenadas son referencias de la cabecera, no direcciones exactas de recogida o entrega.

Se sirve desde `/api/maps/municipalities` para que los formularios funcionen sin consultar al proveedor en cada selección. Para actualizarlo, revisar el catálogo de origen y regenerar agrupando `dpto` y conservando `cod_mpio`, `nom_mpio`, `latitud` y `longitud`.
