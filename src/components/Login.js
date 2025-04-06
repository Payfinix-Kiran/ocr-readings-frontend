import React, { useState } from "react";
import { login } from "../api";
import "../Login.css";

const Login = ({ setUsername, setRole }) => {
  const [username, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await login({ username, password });

      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);

      setUsername(data.username);
      setRole(data.role);
    } catch (err) {
      setErrorMessage("Login failed! Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Welcome Back!</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsernameInput(e.target.value)}
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <button type="submit" className="login-button" disabled={isLoading}>
          Login
        </button>
      </form>

      {isLoading && <p>Loading... Please Wait</p>}
    </div>
  );
};

export default Login;
