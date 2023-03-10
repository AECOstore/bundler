import 'piral/polyfills';
import * as React from 'react'
import { createPiral, Piral, SetComponent, LoadingIndicatorProps, SetRoute, Dashboard, PiralInstance, PiletApi, PiralPlugin } from 'piral';
import { layout, Layout } from './layout';
import { ErrorInfo, errors } from './layout/Error'
import { render } from 'react-dom';
import { DashboardContainer, DashboardTile } from './layout/Dashboard';
import { MenuContainer } from './layout/Menu'
import { NotificationsHost, NotificationsToast } from './layout/Notifications';
import CONSTANTS from './constants'
import { createContainersApi } from 'piral-containers';
import * as piralcore from "piral-core"
import jsonld from 'jsonld'
import { createAecoStoreApi } from './apis'
import { getConfigQuery } from './queries'
import {Button} from '@mui/material'
import Store from './store'
const ttl2jsonld = require('@frogcat/ttl2jsonld').parse;
const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
const myEngine = new QueryEngine();

const projectData = [
  {
      "projectUrl": "https://pod.werbrouck.me/engineer/40050b82-9907-434c-91ab-7ce7c137d8b6",
      "pod": "https://pod.werbrouck.me/engineer/",
      "endpoint": "https://fuseki.werbrouck.me/demo/engineer/sparql",
      "referenceRegistry": "https://pod.werbrouck.me/architect/0d80e558-8f5b-491f-856b-636e29d3c2b5"
  },
  {
      "projectUrl": "https://pod.werbrouck.me/fm/fb3d5bcd-8bcb-4d46-be2b-6c3ef824d5d9",
      "pod": "https://pod.werbrouck.me/fm/",
      "endpoint": "https://fuseki.werbrouck.me/demo/fm/sparql",
      "referenceRegistry": "https://pod.werbrouck.me/architect/0d80e558-8f5b-491f-856b-636e29d3c2b5"
  },
  {
      "projectUrl": "https://pod.werbrouck.me/architect/0c39ccf8-b17e-47d8-a1d7-49a71c1a342f",
      "pod": "https://pod.werbrouck.me/architect/",
      "endpoint": "https://fuseki.werbrouck.me/demo/architect/sparql",
      "referenceRegistry": "https://pod.werbrouck.me/architect/0d80e558-8f5b-491f-856b-636e29d3c2b5"
  }
]

sessionStorage.setItem('dbg:view-state', "off")

function filterItems(res) {
  const items = res.items
  const toBeLoaded = ["auth-pilet"]
  const config = []
  for (const item of items) {
    if (toBeLoaded.includes(item.name)) {
      config.push(item)
    }
  }
  return config
}

const Loader: React.FC<LoadingIndicatorProps> = () => (
  <div className="app-center">
    <div className="spinner circles">Loading ...</div>
  </div>
);

async function makePiral(feedUrl) {

  // ugly, make better when time ...
  function reshapeConfig(config) {
    const items = []
    const added = []
    const filtered = []
    for (const page of config.pages) {
      if (page.modules) {
        const mod = constructTree(page, [])
        items.push(mod)
      }
      items.push(page)
    }
    for (const item of items.flat()) {
      if (!added.includes(item.link)) {
        filtered.push(item)
        added.push(item.link)
      }
    }
    return filtered
  }

  function constructTree(root, recursiveArray?) {
    const resources = root.modules
    for (const res of resources) {
      recursiveArray.push(res);
      if (res.modules) {
        recursiveArray = constructTree(res, recursiveArray);
      } else {
        recursiveArray.push(res)
      }
    }
    return recursiveArray;
  }

  function configFromStream(quadStream) {
    return new Promise((resolve, reject) => {
      let configuration = ""
      quadStream.on('data', (quad) => {
        configuration += `<${quad.subject.value}> `
        configuration += `<${quad.predicate.value}> `
        if (quad.object.value.startsWith("http")) {
          configuration += `<${quad.object.value}> . `
        } else {
          configuration += `"${quad.object.value}" . `
        }
      })
      quadStream.on('end', () => resolve(configuration))
      quadStream.on('error', (err) => {
        console.log('error', err)
        reject(err)
      })
    })
  }

  async function remapConfigToJSON(feedUrl): Promise<any> {
    const query = getConfigQuery
    const quadStream = await myEngine.queryQuads(query, { sources: [feedUrl], lenient: true })
    const config = await configFromStream(quadStream)
    const jsonConfig = ttl2jsonld(config)
    const context = {
      "@context": {
        "link": {"@id": "http://w3id.org/mifesto#code", "@type": "@id"},
        "spec": "http://usefulinc.com/ns/doap#revision",
        "name": "http://www.w3.org/2000/01/rdf-schema#label",
        "route": "http://w3id.org/mifesto#hasRoute",
        "type": {"@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "@type": "@id"},
        "hosts": {"@id": "http://w3id.org/mifesto#hosts", "@type": "@id"},
        "initialColumns": "http://w3id.org/mifesto#initialColumns",
        "initialRows": "http://w3id.org/mifesto#initialRows"
      }
    }
    const flattened = await jsonld.flatten(jsonConfig)
    const compacted = await jsonld.compact(flattened, context)
    const piralConfig = {
      items : compacted["@graph"] || [compacted],
      feed: "sample"
    }
    console.log('piralConfig :>> ', piralConfig);
    return piralConfig
  }
  
  const configuration = await remapConfigToJSON(feedUrl)
  const p = createPiral({
    requestPilets() {
      return remapConfigToJSON(feedUrl).then(i => i.items)
    },
    plugins: [createAecoStoreApi(), createContainersApi()]
  });
  p.root.setData("CONSTANTS", CONSTANTS)
  p.root.setData("CONFIGURATION", configuration)
  return p
}

function getRoutes(items) {
  const routes = {}
  items.filter(item => item.route).forEach(item => {
    routes[item.route] = item.hosts
  })
  return routes
}

const App = () => {
  const [feedUrl, setFeedUrl] = React.useState(CONSTANTS.FEEDURL)
  // const [feedUrl, setFeedUrl] = React.useState(undefined)
  const [piral, setPiral] = React.useState(undefined)
  const [conceptLoading, setConceptLoading] = React.useState(false)
 
  React.useEffect(() => {
    if (piral === undefined && feedUrl) {
      // const p = makePiral(feedUrl)
      makePiral(feedUrl).then(res => {
        setPiral(res)
        const routes = getRoutes(res.root.getData("CONFIGURATION").items)
      })
      // setPiral(p)
    }
  }, [piral, feedUrl])

  return (
    <div>
      {piral ? (
        <div>
          <Button onClick={() => {setFeedUrl(undefined); setPiral(undefined)}}>Back to Store</Button>
          {conceptLoading ? <p>Interlinking concepts...</p> : <></>}
          <PiralComponent piral={piral} setConceptLoading={setConceptLoading}/>
        </div>
      ) : (
        <div>
          <Store setFeedUrl={setFeedUrl}/>
        </div>
      )}
    </div>
  )
}



const PiralComponent = ({ piral, setConceptLoading }: { piral: PiralInstance, setConceptLoading }) => {
  piral.root.setDataGlobal(CONSTANTS.ACTIVE_PROJECT, projectData)

  piral.on('store-data', async ({ name, value }) => {
    if (name == CONSTANTS.SELECTED_REFERENCES) {
      setConceptLoading(true)
      const p = piral.root.getData(CONSTANTS.ACTIVE_PROJECT)
      const concepts = await piral.root.findConceptsById(value, p)
      piral.root.setDataGlobal(CONSTANTS.SELECTED_CONCEPTS, concepts)
      setConceptLoading(false)
      }
  });
  
  return (
    <Piral instance={piral}>
      <SetComponent name="Layout" component={Layout} />
      <SetComponent name="DashboardContainer" component={DashboardContainer} />
      <SetComponent name="DashboardTile" component={DashboardTile} />
      <SetComponent name="MenuContainer" component={MenuContainer}/>
      <SetComponent name="LoadingIndicator" component={Loader} />
      <SetComponent name="ErrorInfo" component={ErrorInfo} />
      <SetComponent name="NotificationsHost" component={NotificationsHost} />
      <SetComponent name="NotificationsToast" component={NotificationsToast} />
      {/* <SetRoute path="/" component={Dashboard} /> */}
    </Piral>
  )
}

render(<App />, document.querySelector('#app'));
