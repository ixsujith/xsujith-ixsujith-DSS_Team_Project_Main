package com.DSS.project.Exception;

public class InvalidQueryException extends RuntimeException{
    public InvalidQueryException(String message) {
        super(message);
    }
}
