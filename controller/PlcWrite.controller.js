var writeTagInPlc = (tag,value,topic)=>{
    global.mqtt_client.publish(topic+"/write", `[{"id":"${tag}","v":"${value}"}]`,{
        qos:2
    },(err,pkt)=>{
        console.log("From Mqtt write",err,pkt)
    })
}

module.exports = {
    writeTagInPlc
}