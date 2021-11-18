/// <reference lib="webworker" />


addEventListener('message', ({ data }) => {
  // const response = `worker response to ${data}`;
  console.log(`addEventListener message ${data}`);
  const response = data;
  postMessage(response);
});
