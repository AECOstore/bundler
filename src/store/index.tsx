import React from 'react'
import { Typography, Button, FormGroup, FormLabel, Checkbox, FormControl, FormControlLabel, RadioGroup, Radio } from "@mui/material"
import CONSTANTS from '../constants'

const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;


const stores = ["https://pod.werbrouck.me/aecostore/store"]

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
    <div style={{ alignContent: "center", padding: 30, alignItems: "center", justifyContent: "center", marginTop: "100px", textAlign: "center" }}>
      <h1>Welcome to the Mifesto store!</h1>
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

    </div>
  )
}


export default Store