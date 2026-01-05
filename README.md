## SolidLab Demo Link Traversal
This demo shows how link traversal could be used for a social media application. In this demo you can
- Log in and view your profile details
- Find all the people you know
- Display information of a specific person
- Find all Forums you are part of and their member counts
- Go to a forum detail page to find its moderator and members
- Go to member pages to get their details.

The underlying data is from [SolidBench](https://github.com/SolidBench/SolidBench.js/), which simulates the Solid environment. All information is retrieved using client-side link traversal queries.
Additionally there is option to view the executed queries, the logger output, and the traversal graph taken by the engine. Note that this significantly slows down query execution.
In the traversed topology, you can hover a node to show its label. In addition, you can click a node to show this node's label without needing to hover over it.
Traversed topologies are capped to around a 1000 nodes, as it would otherwise slow the browser too much. 

## Set-up
```bash
    npm install
    npm run build
    npm run dev
```

## TODO:
- [ ] Going directly towards a URL with details page without first coming from overview page makes it error as the url does not contain the correct
      starting point for link traversal query
- [ ] Improve layout / readability?
- [ ] Logger filter does not work properly it 1. can't filter out "determined first entry...." logs for binding join. 
Also that log doesn't show the entry properly. 2. It doesn't filter out things that should be filtered out. Probably something to do with async.
- [ ] Authentication either through fake account or real authentication
- [ ] Make a landing page
