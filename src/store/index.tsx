import React from 'react'
import { Typography, Button, FormGroup, FormLabel, Checkbox, FormControl, FormControlLabel, RadioGroup, Radio, Grid } from "@mui/material"
import CONSTANTS from '../constants'

const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;


const stores = [`${CONSTANTS.DEFAULT_IDP}/aecostore/store`]

const Store = (props) => {
  const [selectedStores, setSelectedStores] = React.useState(stores)
  const [configs, setConfigs] = React.useState([])
  const [selectedConfig, setSelectedConfig] = React.useState()
  const { setFeedUrl } = props

  React.useEffect(() => {
    if (configs.length) {
      setSelectedConfig(configs[0])
    }
  }, [configs])

  async function queryStoresForConfigurations() {
    const myEngine = new QueryEngine()
    const query = `
    prefix dcat: <http://www.w3.org/ns/dcat#>
    prefix mifesto: <http://w3id.org/mifesto#>

    SELECT ?config WHERE {
      ?store dcat:dataset+ ?config .
      ?config a mifesto:Configuration .
    }`
    const results = await myEngine.queryBindings(query, { sources: selectedStores })
    const configs = await results.toArray()
    const all = new Set()
    configs.forEach(c => all.add(c.get('config').id))
    const res = Array.from(all).sort()
    setConfigs(res)
  }

  function toggleRadio(e) {
    setSelectedConfig(e.target.value)
  }

  function toggleStore(url) {
    if (selectedStores.includes(url)) {
      setSelectedStores(prev => prev.filter(i => i != url))
    } else {
      setSelectedStores(prev => [...prev, url])
    }
  }

  return (
    <div style={{textAlign: "justify", padding: 30, alignItems: "center", marginTop: "100px"}}>
          <Grid container spacing={2}>
      <Grid item xs={2}>
      </Grid>
      <Grid item xs={8}>
      <Typography variant="h1" style={{textAlign: "center", marginBottom: 30}}>MIFESTO</Typography>
      <Typography variant="h4">What is Mifesto?</Typography>
      <Typography>The <a href="#">Micro Frontend Store (Mifesto)</a> is a framework to interact with heterogeneous collaborative projects. Its main use case is the built environment, but since the infrastructure is domain-agnostic, any discipline can adopt its main patterns. Mifesto is the GUI part of the patterns proposed in the <a href='https://www.semantic-web-journal.net/content/consolid-federated-ecosystem-heterogeneous-multi-stakeholder-projects-0'>ConSolid</a> ecosystem. Mifesto allows to combine federated interaction modules into a unified application. Modules can be set up to interact with heterogeneous resources such as geometry, imagery and point clouds. Resources and their content are considered "representations" of abstract concepts, and are linked as such. The meaning of an abstract concept then comes from combining its federated representations. Hence, a user can select a geometric instance in a 3D viewer, which triggers the selection of the abstract concept, which can be further enriched by other modules by creating new representations. For example, adding imagery or semantics such as classification data, damage records, properties or history. This principle is demonstrated in Figure 1.</Typography>

      <Image filename="concept_aggregator_modules.png" description="Abstract concepts in the ConSolid ecosystem." index="1"/>
      <Typography>There are other options for modules, too. For example, for authentication, to create projects, send messages between project partners or to validate project data against internal rules or external regulations.

      Along with its loadable code, a module publishes a semantic manifest. Manifests, in turn, can be combined into Interface Configurations, which wire the modules needed to address a particular use case. Because Manifests and Interface Configurations are dereferenceable, they can be aggregated in decentral catalogs, which themselves can again be aggregated indefinitely. The active "Store" is then formed by reconstructing the complete tree of aggregated modules (Figure 2). 


      In order to aggregate all modules into a single GUI, 
      This implementation of the shell application is based on <a>Piral.io</a></Typography>
      <br />
      <Typography>Check the corresponding wiki pages for more information:</Typography>
      <ul>
        <li><a href="https://github.com/ConSolidProject">ConSolid (backend)</a></li>
        <li><a href="https://github.com/AECOstore">Mifesto (frontend)</a></li>
      </ul>
      <hr/>
      <Typography>Please select one or more Mifesto stores below, or add a new one.</Typography>
      <FormGroup style={{ alignContent: "center", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        {stores.map(storeUrl => {
          return <FormControlLabel key={storeUrl} control={<Checkbox checked={selectedStores.includes(storeUrl)} onChange={() => toggleStore(storeUrl)} />} label={storeUrl} />
        })}
      </FormGroup>
      <Button variant="contained" onClick={queryStoresForConfigurations}>Find Modules</Button>
      {configs.length ? (
        <div>
          <div>
            <FormControl>
              <FormLabel>Configuration to load:</FormLabel>
              <RadioGroup value={selectedConfig} onChange={toggleRadio}>
                {configs.map(configUrl => {
                  return <FormControlLabel value={configUrl} control={<Radio />} key={configUrl} label={configUrl} />
                })}
              </RadioGroup>
            </FormControl>
          </div>
          <div>          
            <Button variant="contained" onClick={() => setFeedUrl(selectedConfig)}>Load Configuration</Button>
          </div>
        </div>
      ) : (
        <div></div>
      )}
      </Grid>
      <Grid item xs={2}>
      </Grid>
    </Grid>
    </div>
  )
}

const Image = ({filename, description, index}) => {
  return <div style={{marginTop: 30, marginBottom:30}}>
  <img src={require(`../../public/${filename}`)} width="100%" alt="concepts" />
  <span>Figure {index}: {description}</span>
  </div>
}

export default Store