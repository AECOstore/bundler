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

const ttl2jsonld = require('@frogcat/ttl2jsonld').parse;
const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
const myEngine = new QueryEngine();


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
        "link": {"@id": "http://w3id.org/mfe#code", "@type": "@id"},
        "spec": "http://usefulinc.com/ns/doap#revision",
        "name": "http://www.w3.org/2000/01/rdf-schema#label",
        "route": "http://w3id.org/mfe#registersRoute",
        "type": {"@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "@type": "@id"},
        "hosts": {"@id": "http://w3id.org/mfe#hosts", "@type": "@id"},
        "initialColumns": "http://w3id.org/mfe#initialColumns",
        "initialRows": "http://w3id.org/mfe#initialRows"
      }
    }
    const flattened = await jsonld.flatten(jsonConfig)
    const compacted = await jsonld.compact(flattened, context)
    const piralConfig = {
      items : compacted["@graph"] || [compacted],
      feed: "sample"
    }
    return piralConfig
  }
  
  const configuration = await remapConfigToJSON(feedUrl)
  const p = createPiral({
    requestPilets() {
      return remapConfigToJSON(feedUrl).then(i => {console.log('i', i); return i.items})
      // return remapConfigToJSON(feedUrl).then(i => {console.log('i', i); return i.items})
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
  const [piral, setPiral] = React.useState(undefined)

  React.useEffect(() => {
    if (piral === undefined && feedUrl) {
      // const p = makePiral(feedUrl)
      makePiral(feedUrl).then(res => {
        setPiral(res)
        const routes = getRoutes(res.root.getData("CONFIGURATION").items)
      })
      // setPiral(p)
    }
  }, [piral])

  return (
    <div>
      {piral ? (
        <div>
          <PiralComponent piral={piral} />
        </div>
      ) : (
        <div>
          Loading...
        </div>
      )}
      {/* <input type="text" defaultValue={feedUrl} onChange={e => setFeedUrl(e.target.value)} />
      <button onClick={() => setPiral(undefined)}>load</button> */}
    </div>
  )
}


const PiralComponent = ({ piral }: { piral: PiralInstance }) => {

  
  return (
    <Piral instance={piral}>
      <SetComponent name="Layout" component={Layout} />
      <SetComponent name="DashboardContainer" component={DashboardContainer} />
      <SetComponent name="DashboardTile" component={DashboardTile} />
      <SetComponent name="MenuContainer" component={MenuContainer} />
      <SetComponent name="LoadingIndicator" component={Loader} />
      <SetComponent name="ErrorInfo" component={ErrorInfo} />
      <SetComponent name="NotificationsHost" component={NotificationsHost} />
      <SetComponent name="NotificationsToast" component={NotificationsToast} />
      <SetRoute path="/" component={Dashboard} />
    </Piral>
  )
}

render(<App />, document.querySelector('#app'));
