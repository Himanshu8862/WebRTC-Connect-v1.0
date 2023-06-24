import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
    const [email, setEmail] = useState("");
    const [room, setRoom] = useState("");

    const socket = useSocket();
    const navigate = useNavigate();

    const handleSubmitForm = useCallback(
        (e) => {
            e.preventDefault();
            socket.emit("room:join", { email, room });
        },
        [email, room, socket]
    );

    const handleJoinRoom = useCallback(
        (data) => {
            const { room } = data;
            navigate(`/room/${room}`);
        },
        [navigate]
    );

    useEffect(() => {
        socket.on("room:join", handleJoinRoom);
        return () => {
            socket.off("room:join", handleJoinRoom);
        };
    }, [socket, handleJoinRoom]);

    return (
        <>
            <div className="container w-25">
                <h1>Lobby</h1>
                <form onSubmit={handleSubmitForm}>
                    <div className="form-group">
                        <h3><label htmlFor="email">Email ID</label></h3>
                        <input
                            className="form-control"
                            type="email"
                            id="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <h3><label htmlFor="room">Room Number</label></h3>
                        <input
                        className="form-control"
                            type="text"
                            id="room"
                            required
                            value={room}
                            onChange={(e) => setRoom(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-secondary">Join</button>
                </form>
            </div>
        </>
    );
};

export default LobbyScreen;
